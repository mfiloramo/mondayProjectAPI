import { NextFunction, Request, Response } from 'express';
import { addFragrance, updateFragrance, deleteFragrance } from '../controllers/fragrances.controller';
import { createOrder, updateOrderStatus } from '../controllers/orders.controller';

export const handleWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.body.challenge) {
      res.send({ challenge: req.body.challenge });
      return;
    }

    const { event, itemId, values } = req.body;
    const parentPath: string | undefined = req.baseUrl.split('/').pop();

    let handled: boolean = false;

    if (parentPath === 'fragrances') {
      switch (event) {
        case 'item_created':
          await addFragrance(req, res);
          handled = true;
          break;
        case 'item_updated':
          await updateFragrance(req, res);
          handled = true;
          break;
        case 'item_deleted':
          await deleteFragrance(req, res);
          handled = true;
          break;
        default:
          res.status(400).send('Unknown event');
          return;
      }
    } else if (parentPath === 'orders') {
      switch (event) {
        case 'item_created':
          await createOrder(req, res);
          handled = true;
          break;
        case 'item_updated':
          await updateOrderStatus(req, res);
          handled = true;
          break;
        case 'item_deleted':
          // TODO: HANDLE ORDER DELETION IF APPLICABLE
          handled = true;
          break;
        default:
          res.status(400).send('Unknown event');
          return;
      }
    } else {
      res.status(400).send('Unknown path');
      return;
    }

    if (!handled) {
      next();
    }
  } catch (error: any) {
    res.status(500).send(error);
    console.error(error);
  }
};
