const { sbFetch, getEnv } = require('./_admin-common');

function isCronAuthorized(req) {
  const secret = getEnv('CRON_SECRET');
  const auth = req.headers.authorization || req.headers.Authorization || '';
  return !!secret && auth === `Bearer ${secret}`;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Metodo nao permitido' });
  }

  if (!isCronAuthorized(req)) {
    return res.status(401).json({ success: false, message: 'Nao autorizado' });
  }

  try {
    await sbFetch('products?select=id&limit=1', {
      method: 'GET',
      headers: { Prefer: 'return=minimal' }
    });

    return res.status(200).json({
      success: true,
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Falha ao verificar banco'
    });
  }
};
