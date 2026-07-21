const crypto = require('crypto');

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function getEnv(name) {
  return process.env[name] || '';
}

function supabaseBase() {
  const url = getEnv('SUPABASE_URL') || getEnv('FANJOY_SUPABASE_URL') || '';
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !key) {
    throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao configurados na Vercel');
  }
  return { url: url.replace(/\/$/, ''), key };
}

async function sbFetch(path, options = {}) {
  const { url, key } = supabaseBase();
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const message = (data && (data.message || data.error_description || data.error)) || `Supabase error ${res.status}`;
    throw new Error(message);
  }
  return data;
}

function b64url(value) {
  return Buffer.from(value).toString('base64url');
}

function signAdminToken(username) {
  const secret = getEnv('ADMIN_PANEL_TOKEN');
  if (!secret) throw new Error('ADMIN_PANEL_TOKEN nao configurado na Vercel');
  const payload = {
    sub: String(username || 'admin'),
    exp: Date.now() + SESSION_TTL_MS
  };
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyAdminToken(token) {
  const secret = getEnv('ADMIN_PANEL_TOKEN');
  if (!secret) throw new Error('ADMIN_PANEL_TOKEN nao configurado na Vercel');
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) return false;

  const expectedSig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const left = Buffer.from(sig);
  const right = Buffer.from(expectedSig);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return false;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return Number(payload.exp || 0) > Date.now();
  } catch {
    return false;
  }
}

function assertAdmin(req) {
  const received = req.headers['x-admin-token'] || req.headers['X-Admin-Token'];
  if (!verifyAdminToken(received)) {
    const err = new Error('Nao autorizado');
    err.status = 401;
    throw err;
  }
}

module.exports = { getEnv, sbFetch, assertAdmin, signAdminToken };
