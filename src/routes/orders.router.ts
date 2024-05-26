import express, { Router } from 'express';
import {
  getAllOrders,
  createOrder,
  updateOrderStatus
} from '../controllers/orders.controller';
import { handleOrdersWebhook } from "../middleware/ordersWebhooks";

const router: Router = express.Router();

// API ROUTES
router.get('/', getAllOrders);
router.post('/', createOrder);
router.put('/status', updateOrderStatus);

// WEBHOOK
router.post('/webhook', handleOrdersWebhook);

export const ordersRouter: Router = router;
