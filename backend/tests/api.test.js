const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const crypto = require('node:crypto');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { loadConfig } = require('../config');
const { createAuth } = require('../auth');
const express = require('express');
const { createEvaluationRouter } = require('../routes/evaluate');
let mongo, mlServer, app, User, Evaluation;
const valid = { city: 'Астана', area: 65, rooms: 2, floor: 5, total_floors: 9, ceiling_height: 2.7, year_built: 2015, house_type: 'кирпичный', condition: 'свежий ремонт', district: 'Есильский р-н' };
let readerToken, otherToken;
before(async () => {
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  // Integration fixture: real HTTP ML boundary + real ephemeral MongoDB.
  mlServer = http.createServer((req, res) => {
    let body = ''; req.on('data', x => body += x); req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      if (req.url === '/metadata') return res.end(JSON.stringify({ city: 'Астана' }));
      const input = JSON.parse(body);
      if (input.area <= 0) { res.statusCode = 422; return res.end(JSON.stringify({ detail: [{ loc: ['body', 'area'], msg: 'must be positive' }] })); }
      res.end(JSON.stringify({ predicted_price: 32_500_000, price_per_m2: 500_000, input, model_version: 'integration-v2' }));
    });
  });
  await new Promise(resolve => mlServer.listen(0, '127.0.0.1', resolve));
  process.env.ML_SERVICE_URL = `http://127.0.0.1:${mlServer.address().port}`;
  mongo = await MongoMemoryServer.create({ binary: { version: '7.0.24' } });
  await mongoose.connect(mongo.getUri());
  ({ app, User, Evaluation } = require('../server'));
  await User.init();
});
after(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
  if (mlServer) await new Promise(resolve => mlServer.close(resolve));
});

test('startup refuses missing or weak JWT secret', () => {
  assert.throws(() => loadConfig({}), /JWT_SECRET/);
  assert.throws(() => loadConfig({ JWT_SECRET: 'super-secret-key-change-me' }), /JWT_SECRET/);
});
test('public registration cannot create administrator', async () => {
  const response = await request(app).post('/api/register').send({ name: 'Reader', email: 'reader@example.test', password: 'long-enough-password', role: 'admin' }).expect(201);
  assert.equal(response.body.user.role, 'reader');
  readerToken = response.body.token;
  assert.ok(!(response.body.user.passwordHash));
  const other = await request(app).post('/api/register').send({ name: 'Other', email: 'other@example.test', password: 'long-enough-password' }).expect(201);
  otherToken = other.body.token;
});
test('login verifies password and rejects malformed input', async () => {
  await request(app).post('/api/login').send({ email: 'reader@example.test', password: 'wrong' }).expect(401);
  await request(app).post('/api/login').send({ email: {}, password: [] }).expect(400);
  await request(app).post('/api/login').send({ email: 'reader@example.test', password: 'long-enough-password' }).expect(200);
});
test('reader cannot publish posts', async () => {
  await request(app).post('/api/posts').set('Authorization', `Bearer ${readerToken}`).send({}).expect(403);
  await request(app).get('/api/evaluations').expect(401);
});
test('guest valuation does not save orphan history', async () => {
  const result = await request(app).post('/api/evaluate').send(valid).expect(200);
  assert.equal(result.body.saved, false);
  assert.equal(await Evaluation.countDocuments(), 0);
});
test('saved valuation is visible only to its owner', async () => {
  const result = await request(app).post('/api/evaluate').set('Authorization', `Bearer ${readerToken}`).send(valid).expect(200);
  const id = result.body.evaluation_id;
  assert.equal(result.body.saved, true);
  const saved = await request(app).get(`/api/evaluations/${id}`).set('Authorization', `Bearer ${readerToken}`).expect(200);
  assert.equal(saved.body.input.year_built, 2015);
  assert.equal(saved.body.model_version, 'integration-v2');
  await request(app).get(`/api/evaluations/${id}`).set('Authorization', `Bearer ${otherToken}`).expect(403);
  const list = await request(app).get('/api/evaluations').set('Authorization', `Bearer ${otherToken}`).expect(200);
  assert.deepEqual(list.body, []);
});
test('bad JWT and invalid object IDs are rejected', async () => {
  await request(app).post('/api/evaluate').set('Authorization', 'Bearer invalid').send(valid).expect(401);
  await request(app).get('/api/evaluations/invalid').set('Authorization', `Bearer ${readerToken}`).expect(400);
});
test('ML validation errors are forwarded as 422', async () => {
  await request(app).post('/api/evaluate').send({ ...valid, area: 0 }).expect(422);
});
test('administrator can create, edit and delete an article', async () => {
  const user = await User.findOne({ email: 'reader@example.test' }); user.role = 'admin'; await user.save();
  const token = createAuth(process.env.JWT_SECRET).createToken(user.toSafeObject());
  const created = await request(app).post('/api/posts').set('Authorization', `Bearer ${token}`).send({ title: 'Test', description: 'Test summary', content: 'Test content', city: 'Астана' }).expect(201);
  await request(app).patch(`/api/posts/${created.body._id}`).set('Authorization', `Bearer ${token}`).send({ title: 'Edited' }).expect(200);
  await request(app).delete(`/api/posts/${created.body._id}`).set('Authorization', `Bearer ${token}`).expect(200);
});
test('ML timeout and outage have distinct statuses', async () => {
  for (const [code, status] of [['ECONNABORTED', 504], ['ECONNREFUSED', 503]]) {
    const isolated = express(); isolated.use(express.json());
    isolated.use('/api/evaluate', createEvaluationRouter({ optionalAuth: (req, res, next) => next(), Evaluation, mlClient: { post: async () => { throw { code }; } } }));
    await request(isolated).post('/api/evaluate').send(valid).expect(status);
  }
});
