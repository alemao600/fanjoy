const crypto = require('crypto');

const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function rateLimit(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const item = attempts.get(ip) || { count: 0, resetAt: now + WINDOW_MS };
  if (now > item.resetAt) {
    item.count = 0;
    item.resetAt = now + WINDOW_MS;
  }
  item.count += 1;
  attempts.set(ip, item);
  if (item.count > MAX_ATTEMPTS) {
    const err = new Error('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
    err.status = 429;
    throw err;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    rateLimit(req);

    const expectedUser = process.env.ADMIN_USERNAME;
    const expectedPassword = process.env.ADMIN_PASSWORD;
    const adminToken = process.env.ADMIN_PANEL_TOKEN;

    if (!expectedUser || !expectedPassword || !adminToken) {
      return res.status(500).json({
        success: false,
        message: 'Credenciais admin não configuradas na Vercel'
      });
    }

    const { username, password } = req.body || {};
    const valid = safeEqual(String(username || '').trim(), expectedUser) && safeEqual(password, expectedPassword);

    if (!valid) {
      return res.status(401).json({ success: false, message: 'Usuário ou senha incorretos' });
    }

    return res.status(200).json({
      success: true,
      data: {
        username: expectedUser,
        token: adminToken
      }
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Erro interno'
    });
  }
};
