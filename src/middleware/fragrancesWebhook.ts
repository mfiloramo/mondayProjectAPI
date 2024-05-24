import { Request, Response } from 'express';
import { addFragrance, updateFragrance, deleteFragrance } from '../controllers/fragrances.controller';

export const handleFragrancesWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    // DEBUG: LOG WEBHOOK PAYLOAD
    // console.log(req.body.event);

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
      case 'create_pulse':
        console.log(event);
        await addFragrance(req, res);
        break;
      case 'update_column_value':
        await updateFragrance(req, res);
        break;
      case 'delete_pulse':
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
