const { sbFetch, assertAdmin } = require('./_admin-common');
const { hashPassword, validateAdmin } = require('./admin-login');

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

    const payload = {
      id: 'main',
      username,
      password_hash: hashPassword(newPassword),
      updated_at: new Date().toISOString()
    };

    await sbFetch('admin_credentials?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(payload)
    });

    return res.status(200).json({ success: true, data: { username } });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || 'Erro interno' });
  }
};
