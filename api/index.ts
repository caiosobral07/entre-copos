import type { IncomingMessage, ServerResponse } from 'http';
import { createExpressApp } from '../server/app.js';

const app = createExpressApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return app(req, res);
}
