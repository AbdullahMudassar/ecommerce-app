const express = require('express');
const pino = require('pino');
const client = require('prom-client');
const { createClient } = require('redis');

const logger = pino({ base: { service: 'cart-service' } });
const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redis.on('error', (err) => logger.error({ err: err.message }, 'redis error'));

// ---------- Metrics ----------
client.collectDefaultMetrics();
const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
});

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  if (req.path === '/health' || req.path === '/metrics') return next();
  const end = httpDuration.startTimer();
  res.on('finish', () => {
    const route = req.route ? req.baseUrl + req.route.path : 'unknown';
    end({ method: req.method, route, status_code: res.statusCode });
    logger.info({ method: req.method, path: req.originalUrl, status: res.statusCode }, 'request');
  });
  next();
});

// Healthy only if Redis answers
app.get('/health', async (req, res) => {
  try {
    await redis.ping();
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'redis unavailable' });
  }
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// ---------- Business logic ----------
app.get('/api/cart/:userId', async (req, res) => {
  try {
    const items = await redis.hGetAll(`cart:${req.params.userId}`);
    res.json({ userId: req.params.userId, items });
  } catch (err) {
    logger.error({ err: err.message }, 'failed to read cart');
    res.status(500).json({ error: 'cart unavailable' });
  }
});

// Body: { "productId": 1, "quantity": 2 }
app.post('/api/cart/:userId', async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  if (!productId) return res.status(400).json({ error: 'productId is required' });
  try {
    await redis.hIncrBy(`cart:${req.params.userId}`, String(productId), Number(quantity));
    res.status(201).json({ ok: true });
  } catch (err) {
    logger.error({ err: err.message }, 'failed to update cart');
    res.status(500).json({ error: 'cart unavailable' });
  }
});

module.exports = { app, logger, redis };

