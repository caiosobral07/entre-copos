import express from 'express';
import { apiRouter } from './routes.js';

export function createExpressApp() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // CORS support
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    next();
  });

  // Healthcheck endpoints
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), platform: process.env.VERCEL ? 'vercel' : 'node' });
  });
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), platform: process.env.VERCEL ? 'vercel' : 'node' });
  });

  // Mount API router under both /api and root /
  // This guarantees that whether Vercel rewrites /api/foo or forwards /foo, routes match seamlessly
  app.use('/api', apiRouter);
  app.use('/', apiRouter);

  return app;
}
