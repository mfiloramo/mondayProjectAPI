"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// MODULE IMPORTS
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
// ROUTER IMPORTS
const fragrances_router_1 = require("./routes/fragrances.router");
const orders_router_1 = require("./routes/orders.router");
// GLOBAL VARIABLES
const app = (0, express_1.default)();
const PORT = 3010;
const server = http_1.default.createServer(app);
// CORS MIDDLEWARE
const corsOptions = {
    origin: 'http://localhost:3000',
    optionsSuccessStatus: 200,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
};
app.use(express_1.default.json());
app.use((0, cors_1.default)(corsOptions));
// SERVER ROUTES
app
    .use('/api/fragrances', fragrances_router_1.fragrancesRouter)
    .use('/api/orders', orders_router_1.ordersRouter);
// HANDLE PREFLIGHT REQUESTS
app.options('*', (0, cors_1.default)(corsOptions));
// WILDCARD ENDPOINT
app.use('*', (req, res) => {
    res.status(404).send('Resource not found');
});
// RUN SERVER ON SPECIFIED PORT
server.listen(PORT, () => {
    console.log(`Server listening on port: ${PORT}...`);
});
