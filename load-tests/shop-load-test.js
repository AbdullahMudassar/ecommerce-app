import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 20,
  duration: '3m',
};

export default function () {
  const products = http.get('http://shop.localtest.me/api/products');

  check(products, {
    'product list returned 200': (r) => r.status === 200,
  });

  const payload = JSON.stringify({
    userId: 'load-test-user',
    productId: 1,
    quantity: 1,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const order = http.post(
    'http://shop.localtest.me/api/orders',
    payload,
    params
  );

  check(order, {
    'order created successfully': (r) =>
      r.status === 200 || r.status === 201,
  });

  sleep(1);
}
