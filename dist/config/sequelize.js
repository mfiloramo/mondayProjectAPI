"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequelize = void 0;
const sequelize_1 = require("sequelize");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_HOST = process.env.DB_HOST;
const DB_PASS = process.env.DB_PASS;
const options = {
    host: DB_HOST,
    dialect: 'mssql',
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
};
const sequelize = new sequelize_1.Sequelize(DB_NAME, DB_USER, DB_PASS, options);
exports.sequelize = sequelize;
