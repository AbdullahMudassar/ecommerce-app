const { test } = require('node:test');
const assert = require('node:assert');
const { app } = require('./app');

test('GET /metrics works', async () => {
  const server = app.listen(0);
  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/metrics`);
    assert.strictEqual(res.status, 200);
  } finally {
    server.close();
  }
});

