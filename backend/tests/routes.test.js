const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const express = require('express');
const request = require('supertest');
const { createAuth } = require('../auth');
const { loadConfig } = require('../config');
const { createEvaluationRouter } = require('../routes/evaluate');
const secret = crypto.randomBytes(32).toString('hex');
const auth = createAuth(secret);
const token = auth.createToken({ id: 'user-1', role: 'reader', name: 'Test' });
const prediction = { input: { area: 65 }, predicted_price: 32500000, price_per_m2: 500000, model_version: 'test-v2' };
function fixture(response = prediction, error = null) {
  const saved = [];
  const app = express(); app.use(express.json());
  app.use('/api/evaluate', createEvaluationRouter({ optionalAuth: auth.optionalAuth, Evaluation: { create: async value => { saved.push(value); return { _id: 'record-1' }; } }, mlClient: { get: async () => ({ data: { city: 'Астана' } }), post: async () => { if (error) throw error; return { data: response }; } } }));
  return { app, saved };
}
test('JWT secret is mandatory and bootstrap cannot use weak password', () => {
  assert.throws(() => loadConfig({}), /JWT_SECRET/);
  assert.throws(() => loadConfig({ JWT_SECRET: secret, ADMIN_EMAIL: 'a@example.test', ADMIN_PASSWORD: 'admin' }), /ADMIN/);
});
test('guests get a price but no orphan database record', async () => {
  const { app, saved } = fixture();
  const res = await request(app).post('/api/evaluate').send({ area: 65 }).expect(200);
  assert.equal(res.body.saved, false); assert.equal(saved.length, 0);
});
test('authenticated predictions persist verified input and model version', async () => {
  const { app, saved } = fixture();
  const res = await request(app).post('/api/evaluate').set('Authorization', `Bearer ${token}`).send({ area: 65 }).expect(200);
  assert.equal(res.body.saved, true); assert.equal(saved[0].user.id, 'user-1');
  assert.equal(saved[0].model_version, 'test-v2'); assert.deepEqual(saved[0].input, prediction.input);
});
test('tampered token is rejected before saving', async () => {
  const { app, saved } = fixture();
  await request(app).post('/api/evaluate').set('Authorization', `Bearer ${token}x`).send({}).expect(401);
  assert.equal(saved.length, 0);
});
test('prediction validation, timeout and outage preserve useful HTTP status', async () => {
  for (const [error, status] of [[{ response: { status: 422, data: { detail: [{ loc: ['body', 'area'], msg: 'invalid area' }] } } }, 422], [{ code: 'ECONNABORTED' }, 504], [{ code: 'ECONNREFUSED' }, 503]]) {
    await request(fixture(null, error).app).post('/api/evaluate').send({}).expect(status);
  }
});
test('invalid prediction is not saved', async () => {
  const { app, saved } = fixture({ ...prediction, predicted_price: -1 });
  await request(app).post('/api/evaluate').set('Authorization', `Bearer ${token}`).send({}).expect(502);
  assert.equal(saved.length, 0);
});
