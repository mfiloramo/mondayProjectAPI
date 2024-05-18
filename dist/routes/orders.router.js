"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ordersRouter = void 0;
const express_1 = __importDefault(require("express"));
const orders_controller_1 = require("../controllers/orders.controller");
const router = express_1.default.Router();
router.get('/', orders_controller_1.getAllOrders);
router.post('/', orders_controller_1.createOrder);
router.put('/:id', orders_controller_1.updateOrderStatus);
exports.ordersRouter = router;
