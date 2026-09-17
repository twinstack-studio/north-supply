import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { pool } from './db/pool.js';
import { env } from './lib/env.js';
import { describeTransport } from './lib/mailer.js';
import { optionalAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { addressRouter } from './routes/address.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { imageRouter } from './routes/image.routes.js';
import { categoryRouter, newsletterRouter } from './routes/misc.routes.js';
import { couponRouter, orderRouter } from './routes/order.routes.js';
import { productRouter } from './routes/product.routes.js';
import { returnRouter } from './routes/return.routes.js';
import { reviewRouter } from './routes/review.routes.js';
import { wishlistRouter } from './routes/wishlist.routes.js';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();

app.set('trust proxy', 1);
app.use(
  helmet({
    // Relaxed so the Vite dev server can load the generated product SVGs
    // served from this origin.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        // Product photography is hotlinked from Unsplash's CDN. Without this,
        // helmet's default `img-src 'self' data:` would block every photo the
        // moment the built client is served from this server.
        'img-src': [
          "'self'", 'data:',
          'https://images.unsplash.com',
          // Google profile pictures on accounts created through Google.
          'https://lh3.googleusercontent.com',
        ],
        // Google Identity Services renders its button in an iframe and loads
        // its own script; without these the sign-in button silently fails.
        'script-src': ["'self'", "'unsafe-inline'", 'https://accounts.google.com'],
        'frame-src': ["'self'", 'https://accounts.google.com'],
        'connect-src': ["'self'", 'https://accounts.google.com'],
      },
    },
  }),
);
app.use(cors({ origin: env.clientOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(morgan(env.isProd ? 'combined' : 'dev'));
app.use(optionalAuth);

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'up', env: env.nodeEnv });
  } catch {
    res.status(503).json({ ok: false, db: 'down' });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/products', productRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/reviews', reviewRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/addresses', addressRouter);
app.use('/api/orders', orderRouter);
app.use('/api/returns', returnRouter);
app.use('/api/coupons', couponRouter);
app.use('/api/newsletter', newsletterRouter);
app.use('/api/admin', adminRouter);
app.use('/api/images', imageRouter);

if (env.isProd) {
  const currentDirectory = dirname(fileURLToPath(import.meta.url));
  const clientDirectory = resolve(currentDirectory, '../../client/dist');

  app.use(express.static(clientDirectory));

  app.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }

    return res.sendFile(resolve(clientDirectory, 'index.html'));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(env.port, () => {
  console.log(`[server] NORTH SUPPLY API listening on http://localhost:${env.port}`);
  console.log(`[mail]   ${describeTransport()}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    console.log(`\n[server] ${signal} received, shutting down.`);
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    });
  });
}
