const test = require('node:test');
const assert = require('node:assert');
const { app } = require('./app');

test('GET /api/products returns a non-empty product list', async () => {
  const server = app.listen(0);

  try {
    const response = await fetch(`http://localhost:${server.address().port}/api/products`);
    assert.strictEqual(response.status, 200);

    const products = await response.json();
    assert.ok(products.length > 0);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
