import { Request, Response } from 'express';
import { createOrder, updateOrderStatus } from '../controllers/orders.controller';

export const handleOrdersWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    // MONDAY.COM WEBHOOK VERIFIER
    if (req.body.challenge) {
      res.send({ challenge: req.body.challenge });
      return;
    }

    // TODO: CHANGE PARENTPATH TO event.type
    const { event } = req.body;
    const parentPath: string | undefined = req.baseUrl.split('/').pop();

    // ROUTE WEBHOOK TO ORDERS CONTROLLER
    switch (event.type) {
      case 'item_created':
        await createOrder(req, res);
        break;
      case 'update_column_value':
        await updateOrderStatus(req, res);
        break;
      case 'item_deleted':
        // TODO: HANDLE ORDER DELETION IF APPLICABLE
        // ...
        break;
      default:
        res.status(400).send('Unknown event');
        return;
    }
  } catch (error: any) {
    res.status(500).send(error);
    console.error(error);
  }
};
