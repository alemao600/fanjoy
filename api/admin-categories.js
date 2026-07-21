const { sbFetch, assertAdmin } = require('./_admin-common');

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'categoria';
}

function isUuid(value) {
  return /^[0-9a-f-]{36}$/i.test(String(value || ''));
}

module.exports = async (req, res) => {
  try {
    assertAdmin(req);

    if (req.method === 'POST') {
      const name = String(req.body?.name || '').trim();
      const slug = String(req.body?.slug || slugify(name)).trim();
      if (!name) return res.status(400).json({ success: false, message: 'Nome da categoria é obrigatório.' });
      const created = await sbFetch('categories?on_conflict=slug', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ name, slug })
      });
      return res.status(200).json({ success: true, data: Array.isArray(created) ? created[0] : created });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query?.id || '').trim();
      if (!isUuid(id)) return res.status(400).json({ success: false, message: 'id da categoria é inválido.' });
      const links = await sbFetch(`product_categories?select=product_id&category_id=eq.${encodeURIComponent(id)}&limit=1`);
      if (Array.isArray(links) && links.length) {
        return res.status(409).json({ success: false, message: 'Essa categoria está em uso por produtos. Remova dos produtos primeiro.' });
      }
      await sbFetch(`categories?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return res.status(200).json({ success: true, data: { deleted: true } });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || 'Erro interno' });
  }
};
