import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import clientsRoutes from '../routes/clients.js';

// Use in-memory database for isolation
process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test';

let server;
let base;

// Start express server before tests

test.before(() => {
  const app = express();
  app.use(express.json());
  app.use('/api/clients', clientsRoutes);
  server = app.listen(0);
  const { port } = server.address();
  base = `http://127.0.0.1:${port}`;
});

// Close server after tests

test.after(() => {
  server.close();
});

// Test client creation and listing

test('client is returned in sidebar list after save', async () => {
  const createRes = await fetch(`${base}/api/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company: 'TestCo' })
  });
  assert.equal(createRes.status, 200);
  const createData = await createRes.json();
  assert.equal(createData.success, true);

  const listRes = await fetch(`${base}/api/clients`);
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  assert.equal(listData.success, true);
  assert.equal(listData.clients.length, 1);
  assert.equal(listData.clients[0].company, 'TestCo');
});
