// MODULE IMPORTS
import express, { Express } from 'express';
import http from 'http';
import cors, { CorsOptions } from 'cors';

// ROUTER IMPORTS
import { fragrancesRouter } from "./routes/fragrances.router";
import { ordersRouter } from "./routes/orders.router";

// GLOBAL VARIABLES
const app: Express = express();
const PORT: number = 3010;
const server: any = http.createServer(app);

// CORS MIDDLEWARE
const corsOptions: CorsOptions = {
  origin: 'http://localhost:3000',
  optionsSuccessStatus: 200,
  credentials: true,
  methods: [ 'GET', 'POST', 'PUT', 'DELETE' ],
  allowedHeaders: [ 'Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept' ],
};
app.use(express.json());
app.use(cors(corsOptions));

// SERVER ROUTES
app
  .use('/api/fragrances', fragrancesRouter)
  .use('/api/orders', ordersRouter);

// HANDLE PREFLIGHT REQUESTS
app.options('*', cors(corsOptions));

// WILDCARD ENDPOINT
app.use('*', (req: any, res: any): void => {
  res.status(404).send('Resource not found');
});

// RUN SERVER ON SPECIFIED PORT
server.listen(PORT, (): void => {
  console.log(`Server listening on port: ${ PORT }...`);
});
