const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

function loadConfig(env = process.env) {
  const secret = env.JWT_SECRET || '';
  if (secret.length < 32 || /change.me|replace.me|super-secret/i.test(secret)) {
    throw new Error('Set JWT_SECRET to a random secret of at least 32 characters in backend/.env');
  }
  const email = (env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = env.ADMIN_PASSWORD || '';
  if (Boolean(email) !== Boolean(password) || (password && (password.length < 12 || Buffer.byteLength(password) > 72))) {
    throw new Error('Optional admin bootstrap requires ADMIN_EMAIL and ADMIN_PASSWORD (12 characters minimum; 72 bytes maximum)');
  }
  return {
    port: Number(env.PORT || 5000), mongoUri: env.MONGO_URI || 'mongodb://127.0.0.1:27017/estatepulse',
    jwtSecret: secret, adminEmail: email, adminPassword: password, adminName: env.ADMIN_NAME || 'Administrator',
    origins: (env.CORS_ORIGINS || 'http://localhost:3000').split(',').map(x => x.trim()),
    mlUrl: env.ML_SERVICE_URL || 'http://127.0.0.1:8000',
  };
}
module.exports = { loadConfig };
