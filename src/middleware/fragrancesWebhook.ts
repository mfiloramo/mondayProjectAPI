import { Request, Response } from 'express';
import { addFragrance, updateFragrance, deleteFragrance } from '../controllers/fragrances.controller';

export const handleFragrancesWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    // MONDAY.COM WEBHOOK VERIFIER
    if (req.body.challenge) {
      res.send({ challenge: req.body.challenge });
      return;
    }

    // TODO: CHANGE PARENTPATH TO event.type
    const { event } = req.body;
    const parentPath: string | undefined = req.baseUrl.split('/').pop();

    // ROUTE WEBHOOK TO FRAGRANCES CONTROLLER
    switch (event.type) {
      case 'item_created':
        await addFragrance(req, res);
        break;
      case 'update_column_value':
        await updateFragrance(req, res);
        break;
      case 'item_deleted':
        await deleteFragrance(req, res);
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
