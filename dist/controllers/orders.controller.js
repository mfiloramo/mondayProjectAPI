"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderStatus = exports.createOrder = exports.getAllOrders = void 0;
const sequelize_1 = require("../config/sequelize");
const getAllOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // SELECT ALL ORDERS IN DATABASE
        const selectAll = yield sequelize_1.sequelize.query('EXECUTE GetAllOrders');
        res.send(selectAll[0]);
        // ERROR HANDLING
    }
    catch (error) {
        res.status(500).send(error);
        console.error(error);
    }
});
exports.getAllOrders = getAllOrders;
const createOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // ORDER DATA PAYLOAD
        const { first_name, last_name, number_of_kits, fragrance1_id, fragrance2_id, fragrance3_id } = req.body;
        // ADD ORDER TO DATABASE WHILE ENSURING DATA TYPE INTEGRITY
        const response = yield sequelize_1.sequelize.query('EXECUTE CreateOrder :first_name, :last_name, :number_of_kits, :fragrance1_id, :fragrance2_id, :fragrance3_id', {
            replacements: {
                first_name,
                last_name,
                number_of_kits: parseInt(number_of_kits, 10),
                fragrance1_id: parseInt(fragrance1_id, 10),
                fragrance2_id: parseInt(fragrance2_id, 10),
                fragrance3_id: parseInt(fragrance3_id, 10)
            }
        });
        res.json(response[0]);
    }
    catch (error) {
        // ERROR HANDLING
        res.status(500).send(error);
        console.error(error);
    }
});
exports.createOrder = createOrder;
const updateOrderStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // ORDER DATA PAYLOAD
        const { id, status } = req.body;
        // UPDATE ORDER IN DATABASE
        const response = yield sequelize_1.sequelize.query('EXECUTE UpdateOrderStatus :id, :status', {
            replacements: { id, status }
        });
        // SEND 200 RESPONSE TO USER
        res.status(200).send('Order status updated successfully');
    }
    catch (error) {
        // ERROR HANDLING
        res.status(500).send(error);
        console.error(error);
    }
});
exports.updateOrderStatus = updateOrderStatus;
