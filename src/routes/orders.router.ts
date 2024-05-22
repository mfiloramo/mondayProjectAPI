import express, { Router } from 'express';
import {
  getAllOrders,
  createOrder,
  updateOrderStatus,
  syncOrders, fetchAllOrdersFromMonday
} from '../controllers/orders.controller';
import { handleWebhook } from '../middleware/webhook';

const router: Router = express.Router();

// API ROUTES
router.get('/', getAllOrders);
router.get('/monday', fetchAllOrdersFromMonday);
router.post('/', createOrder);
router.put('/status', updateOrderStatus);
router.get('/sync', syncOrders);

// WEBHOOK
router.post('/webhook', handleWebhook);

export const ordersRouter: Router = router;
