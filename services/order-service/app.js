const express = require('express');
const pino = require('pino');
const client = require('prom-client');

const logger = pino({ base: { service: 'order-service' } });
const PRODUCT_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:8081';

// ---------- Metrics ----------
client.collectDefaultMetrics();
const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
});
const ordersCreated = new client.Counter({
  name: 'orders_created_total',
  help: 'Total number of orders created',
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

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// ---------- Business logic ----------
const orders = []; // stored in memory (lost on restart; fine for training)

app.get('/api/orders', (req, res) => res.json(orders));

// Shows whether the payment secret was provided (used in Phase 5)
app.get('/api/orders/status', (req, res) =>
  res.json({ paymentConfigured: Boolean(process.env.PAYMENT_API_KEY) }));

// Always fails: used to test alerts in Phase 4
app.get('/api/orders/simulate-error', (req, res) => {
  logger.error('simulated failure for testing');
  res.status(500).json({ error: 'simulated error' });
});

// Body: { "userId": "u1", "productId": 1, "quantity": 2 }
app.post('/api/orders', async (req, res) => {
  const { userId, productId, quantity = 1 } = req.body;
  try {
    const r = await fetch(`${PRODUCT_URL}/api/products/${productId}`);
    if (r.status === 404) return res.status(400).json({ error: 'Unknown product' });
    if (!r.ok) throw new Error(`product-service returned ${r.status}`);
    const product = await r.json();

    const order = {
      id: orders.length + 1,
      userId,
      product: product.name,
      quantity,
      total: product.price * quantity,
      createdAt: new Date().toISOString(),
    };
    orders.push(order);
    ordersCreated.inc();
    logger.info({ orderId: order.id, total: order.total }, 'order created');
    res.status(201).json(order);
  } catch (err) {
    logger.error({ err: err.message }, 'failed to create order');
    res.status(502).json({ error: 'Could not reach product-service' });
  }
});

module.exports = { app, logger };

