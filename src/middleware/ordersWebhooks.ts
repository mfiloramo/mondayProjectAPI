import { Request, Response } from 'express';
import { createOrder, deleteOrder, updateOrderStatus } from '../controllers/orders.controller';

export const handleOrdersWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(req.body.event);
    // MONDAY.COM WEBHOOK VERIFIER
    if (req.body.challenge) {
      res.send({ challenge: req.body.challenge });
      return;
    }

    // DESTRUCTURE WEBHOOK EVENT FROM REQUEST BODY
    const { event } = req.body;

    // ROUTE WEBHOOK TO ORDERS CONTROLLER
    switch (event.type) {
      case 'item_created':
        await createOrder(req, res);
        break;
      case 'update_column_value':
        await updateOrderStatus(req, res);
        break;
      case 'item_deleted':
        await deleteOrder(req, res);
        break;
      default:
        res.status(400).send('Unknown event');
        return;
    }
  } catch (error: any) {
    // LOG ERROR TO CONSOLE AND SEND 500 STATUS
    res.status(500).send(error);
    console.error(error);
  }
};
