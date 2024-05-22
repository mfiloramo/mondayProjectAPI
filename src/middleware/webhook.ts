import { NextFunction, Request, Response } from 'express';
import { addFragrance, updateFragrance, deleteFragrance } from '../controllers/fragrances.controller';
import { createOrder, updateOrderStatus } from '../controllers/orders.controller';

export const handleWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // console.log(req.body);

    // MONDAY.COM WEBHOOK VERIFIER
    if (req.body.challenge) {
      res.send({ challenge: req.body.challenge });
      return;
    }

    const { event, itemId, values } = req.body;
    // TODO: CHANGE PARENTPATH TO event.type
    const parentPath: string | undefined = req.baseUrl.split('/').pop();

    // ROUTE WEBHOOK TO FRAGRANCES CONTROLLER
    if (parentPath === 'fragrances') {
      switch (event.type) {
        case 'item_created':
          await addFragrance(req, res);
          break;
        case 'item_updated':
          await updateFragrance(req, res);
          break;
        case 'item_deleted':
          await deleteFragrance(req, res);
          break;
        default:
          res.status(400).send('Unknown event');
          return;
      }

    // ROUTE WEBHOOK TO ORDERS CONTROLLER
    } else if (parentPath === 'orders') {
      console.log(event);
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
    } else {
      res.status(400).send('Unknown path');
      return;
    }

  } catch (error: any) {
    res.status(500).send(error);
    console.error(error);
  }
};
