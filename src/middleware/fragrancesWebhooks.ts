import { Request, Response } from 'express';
import { addFragrance, updateFragrance, deleteFragrance } from '../controllers/fragrances.controller';

export const handleFragrancesWebhook = async (req: Request, res: Response): Promise<void> => {
  // TEMPORARY: MISSING ID COLUMN VALUE HANDLING
  if (req.body.event.columnId === 'text8__1') {
    res.json('Cannot change fragrance ID');
    return;
  }

  try {
    // MONDAY.COM WEBHOOK VERIFIER
    if (req.body.challenge) {
      res.send({ challenge: req.body.challenge });
      return;
    }

    // DESTRUCTURE WEBHOOK EVENT FROM REQUEST BODY
    const { event } = req.body;

    // DEBUG: LOG EVENT
    console.log({ event });

    // ROUTE WEBHOOK TO FRAGRANCES CONTROLLER
    switch (event.type) {
      case 'create_pulse':
        await addFragrance(req, res);
        break;
      case 'update_column_value':
        await updateFragrance(req, res);
        break;
      case 'delete_pulse':
        await deleteFragrance(req, res);
        break;
      default:
        res.status(400).send('Unknown Monday.com webhook event');
        return;
    }
  } catch (error: any) {
    // LOG ERROR TO CONSOLE AND SEND 500 STATUS
    res.status(500).send(error);
    console.error(error);
  }
};
