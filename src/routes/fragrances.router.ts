import express, { Router } from 'express';
import {
  selectAllFragrances,
  addFragrance,
  updateFragrance, deleteFragrance
} from '../controllers/fragrances.controller';
import { handleFragrancesWebhook } from '../middleware/fragrancesWebhooks';

const router: Router = express.Router();

// API ROUTES
router.get('/', selectAllFragrances);
router.post('/', addFragrance);
router.put('/:id', updateFragrance);
router.delete('/:id', deleteFragrance);

// WEBHOOK
router.post('/webhook', handleFragrancesWebhook);

export const fragrancesRouter: Router = router;
