const jwt = require('jsonwebtoken');
function createAuth(secret) {
  const options = { algorithms: ['HS256'], issuer: 'estatepulse', audience: 'estatepulse-web' };
  const createToken = payload => jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: '1h', issuer: options.issuer, audience: options.audience });
  function optionalAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header) return next();
    if (!header.startsWith('Bearer ')) return res.status(401).json({ message: 'Требуется Bearer-токен' });
    try {
      const user = jwt.verify(header.slice(7), secret, options);
      if (!user || typeof user.id !== 'string' || !['reader', 'admin'].includes(user.role)) throw new Error('Invalid identity');
      req.user = user;
      return next();
    } catch {
      return res.status(401).json({ message: 'Неверный или просроченный токен' });
    }
  }
  function requireAuth(req, res, next) {
    return optionalAuth(req, res, () => req.user ? next() : res.status(401).json({ message: 'Требуется авторизация' }));
  }
  function requireAdmin(req, res, next) {
    return req.user?.role === 'admin' ? next() : res.status(403).json({ message: 'Недостаточно прав' });
  }
  return { createToken, optionalAuth, requireAuth, requireAdmin };
}
module.exports = { createAuth };
