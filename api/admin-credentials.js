const { sbFetch, assertAdmin } = require('./_admin-common');
const { hashPassword, validateAdmin, ADMIN_CONFIG_PRODUCT_NAME } = require('./admin-login');

function normalizeUsername(value) {
  return String(value || '').trim();
}

module.exports = async (req, res) => {
  try {
    assertAdmin(req);

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const { currentUsername, currentPassword, newUsername, newPassword } = req.body || {};
    const username = normalizeUsername(newUsername);
    const oldUsername = normalizeUsername(currentUsername || newUsername);

    if (!currentPassword) {
      return res.status(400).json({ success: false, message: 'Informe a senha atual.' });
    }
    if (!username) {
      return res.status(400).json({ success: false, message: 'Informe o usuario.' });
    }
    if (!newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ success: false, message: 'A nova senha deve ter pelo menos 8 caracteres.' });
    }

    const current = await validateAdmin(oldUsername, currentPassword);
    if (!current.ok) {
      return res.status(401).json({ success: false, message: 'Senha atual incorreta.' });
    }

    const admin_credentials = {
      username,
      password_hash: hashPassword(newPassword),
      updated_at: new Date().toISOString()
    };

    const existing = await sbFetch(`products?select=id,extra&name=eq.${encodeURIComponent(ADMIN_CONFIG_PRODUCT_NAME)}&limit=1`);
    const row = Array.isArray(existing) ? existing[0] : null;
    if (row?.id) {
      await sbFetch(`products?id=eq.${encodeURIComponent(row.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          extra: { ...(row.extra || {}), admin_credentials },
          is_active: false,
          updated_at: new Date().toISOString()
        })
      });
    } else {
      await sbFetch('products', {
        method: 'POST',
        body: JSON.stringify({
          name: ADMIN_CONFIG_PRODUCT_NAME,
          description: 'Fanjoy admin credentials',
          price: 0,
          image_url: '',
          images: [],
          tag: null,
          button_text: 'Comprar',
          stock: 0,
          extra: { admin_credentials },
          is_active: false
        })
      });
    }

    return res.status(200).json({ success: true, data: { username } });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || 'Erro interno' });
  }
};
