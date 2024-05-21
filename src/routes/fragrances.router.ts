import express, { Router } from 'express';
import {
  selectAllFragrances,
  addFragrance,
  updateFragrance,
  deleteFragrance,
  syncFragrances
} from '../controllers/fragrances.controller';
import { handleWebhook } from '../middleware/webhook';

const router: Router = express.Router();

// API ROUTES
router.get('/', selectAllFragrances);
router.get('/sync', syncFragrances);
router.post('/', addFragrance);
router.put('/:id', updateFragrance);
router.delete('/:id', deleteFragrance);

// WEBHOOK
router.all('/webhook', handleWebhook);

export const fragrancesRouter: Router = router;
