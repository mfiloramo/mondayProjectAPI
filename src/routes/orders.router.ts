import express, { Router } from 'express';
import {
  getAllOrders,
  createOrder,
  updateOrderStatus,
  syncOrders
} from '../controllers/orders.controller';
import { handleWebhook } from '../middleware/webhook';

const router: Router = express.Router();

// API ROUTES
router.get('/', getAllOrders);
router.post('/', createOrder);
router.put('/status', updateOrderStatus);
router.get('/sync', syncOrders);

// WEBHOOK
router.all('/webhook', handleWebhook);

export const ordersRouter: Router = router;
