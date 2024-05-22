import express, { Router } from 'express';
import {
  selectAllFragrances,
  addFragrance,
  updateFragrance,
  deleteFragrance,
  syncFragrances
} from '../controllers/fragrances.controller';
import { handleFragrancesWebhook } from '../middleware/fragrancesWebhook';

const router: Router = express.Router();

// API ROUTES
router.get('/', selectAllFragrances);
router.get('/sync', syncFragrances);
router.post('/', addFragrance);
router.put('/:id', updateFragrance);
router.delete('/:id', deleteFragrance);

// WEBHOOK
router.post('/webhook', handleFragrancesWebhook);

export const fragrancesRouter: Router = router;
