// MODULE IMPORTS
import express, { Express, Request, Response } from 'express';
import http from 'http';
import cors, { CorsOptions } from 'cors';

// ROUTER IMPORTS
import { fragrancesRouter } from './routes/fragrances.router';
import { ordersRouter } from './routes/orders.router';

// GLOBAL VARIABLES
const app: Express = express();
const PORT: string | number = process.env.PORT || 3046;
const server = http.createServer(app);

// DISABLED FOR DEMO: CORS MIDDLEWARE
// const corsOptions: CorsOptions = {
//   origin: ['http://localhost:3001', 'https://monday-project-jpm952pwp-mfiloramos-projects.vercel.app', 'https://monday-project-nfepi71jf-mfiloramos-projects.vercel.app/', 'https://monday-project.vercel.app'],
//   optionsSuccessStatus: 200,
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
// };

app.use(express.json());
app.use(cors());

// SERVER ROUTES
app
  .use('/api/fragrances', fragrancesRouter)
  .use('/api/orders', ordersRouter);

// HANDLE PREFLIGHT REQUESTS
app.options('*', cors());

// WILDCARD ENDPOINT
app.use('*', (req: Request, res: Response): void => {
  res.status(404).send('Resource not found');
});

// RUN SERVER ON SPECIFIED PORT
server.listen(PORT, (): void => {
  console.log(`Server listening on port: ${PORT}...`);
});
