function getEnv(name) {
  return process.env[name] || '';
}

function supabaseBase() {
  const url = getEnv('SUPABASE_URL') || getEnv('FANJOY_SUPABASE_URL') || '';
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !key) {
    throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados na Vercel');
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

function assertAdmin(req) {
  const expected = getEnv('ADMIN_PANEL_TOKEN');
  if (!expected) throw new Error('ADMIN_PANEL_TOKEN não configurado na Vercel');
  const received = req.headers['x-admin-token'] || req.headers['X-Admin-Token'];
  if (received !== expected) {
    const err = new Error('Não autorizado');
    err.status = 401;
    throw err;
  }
}

module.exports = { getEnv, sbFetch, assertAdmin };
