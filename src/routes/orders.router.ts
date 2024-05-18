import express, { Router } from 'express';
import { getAllOrders, createOrder, updateOrderStatus } from "../controllers/orders.controller";

const router: Router = express.Router();


router.get('/', getAllOrders);
router.post('/', createOrder);
router.put('/:id', updateOrderStatus);

export const ordersRouter: Router = router;
