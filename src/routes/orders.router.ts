import express, { Router } from 'express';
import {
  getAllOrders,
  createOrder,
  updateOrderStatus,
  syncOrders
} from '../controllers/orders.controller';
import { handleWebhook } from '../middleware/webhooks';

const router: Router = express.Router();

router.get('/', getAllOrders);
router.post('/', createOrder);
router.put('/status', updateOrderStatus);
router.get('/sync', syncOrders);
router.post('/webhook', handleWebhook);

export const ordersRouter: Router = router;
