const crypto = require('crypto');
const { getEnv, sbFetch, signAdminToken } = require('./_admin-common');

const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const HASH_ITERATIONS = 120000;
const HASH_KEYLEN = 32;

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

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('base64url');
  const hash = crypto.pbkdf2Sync(String(password), salt, HASH_ITERATIONS, HASH_KEYLEN, 'sha256').toString('base64url');
  return `pbkdf2_sha256$${HASH_ITERATIONS}$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  const [algo, iterations, salt, expectedHash] = String(storedHash || '').split('$');
  if (algo !== 'pbkdf2_sha256' || !iterations || !salt || !expectedHash) return false;
  const hash = crypto.pbkdf2Sync(String(password), salt, Number(iterations), HASH_KEYLEN, 'sha256').toString('base64url');
  return safeEqual(hash, expectedHash);
}

async function getStoredCredentials() {
  try {
    const rows = await sbFetch('admin_credentials?select=username,password_hash&id=eq.main&limit=1');
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  } catch (error) {
    if (/admin_credentials|relation|does not exist/i.test(String(error.message || ''))) return null;
    throw error;
  }
}

async function validateAdmin(username, password) {
  const stored = await getStoredCredentials();
  if (stored) {
    return {
      ok: safeEqual(String(username || '').trim(), stored.username) && verifyPassword(password, stored.password_hash),
      username: stored.username
    };
  }

  const expectedUser = getEnv('ADMIN_USERNAME');
  const expectedPassword = getEnv('ADMIN_PASSWORD');
  if (!expectedUser || !expectedPassword || !getEnv('ADMIN_PANEL_TOKEN')) {
    const err = new Error('Credenciais admin nao configuradas na Vercel');
    err.status = 500;
    throw err;
  }

  return {
    ok: safeEqual(String(username || '').trim(), expectedUser) && safeEqual(password, expectedPassword),
    username: expectedUser
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    rateLimit(req);
    const { username, password } = req.body || {};
    const auth = await validateAdmin(username, password);

    if (!auth.ok) {
      return res.status(401).json({ success: false, message: 'Usuario ou senha incorretos' });
    }

    return res.status(200).json({
      success: true,
      data: {
        username: auth.username,
        token: signAdminToken(auth.username)
      }
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Erro interno'
    });
  }
};

module.exports.hashPassword = hashPassword;
module.exports.verifyPassword = verifyPassword;
module.exports.validateAdmin = validateAdmin;
