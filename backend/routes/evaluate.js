const { Router } = require('express');

function mlError(err, res) {
  if (err.response?.status === 422) {
    const details = err.response.data?.detail;
    const message = Array.isArray(details) ? details.map(x => `${x.loc?.slice(1).join('.') || 'Параметры'}: ${x.msg}`).join('; ') : 'Проверьте параметры объекта';
    return res.status(422).json({ message });
  }
  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') return res.status(504).json({ message: 'Сервис оценки не ответил вовремя. Попробуйте позже.' });
  return res.status(503).json({ message: 'Сервис оценки временно недоступен' });
}

function createEvaluationRouter({ optionalAuth, mlClient, Evaluation }) {
  const router = Router();
  router.get('/metadata', async (req, res) => {
    try { return res.json((await mlClient.get('/metadata')).data); }
    catch (err) { return mlError(err, res); }
  });
  router.post('/', optionalAuth, async (req, res, next) => {
    let prediction;
    try { prediction = (await mlClient.post('/predict', req.body)).data; }
    catch (err) { return mlError(err, res); }
    if (!Number.isFinite(prediction.predicted_price) || prediction.predicted_price <= 0 || !Number.isFinite(prediction.price_per_m2) || prediction.price_per_m2 <= 0 || !prediction.input || typeof prediction.model_version !== 'string') {
      return res.status(502).json({ message: 'Сервис оценки вернул некорректный результат' });
    }
    try {
      // Guests get a prediction without creating inaccessible database records.
      let evaluationId = null;
      if (req.user) {
        const doc = await Evaluation.create({
          user: { id: req.user.id, name: req.user.name, email: req.user.email },
          input: prediction.input,
          predicted_price: prediction.predicted_price,
          price_per_m2: prediction.price_per_m2,
          model_version: prediction.model_version,
        });
        evaluationId = doc._id.toString();
      }
      return res.json({ ...prediction, evaluation_id: evaluationId, saved: Boolean(evaluationId) });
    } catch (err) { return next(err); }
  });
  return router;
}
module.exports = { createEvaluationRouter };
