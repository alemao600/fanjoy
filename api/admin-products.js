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

function dbProduct(payload = {}) {
  const images = Array.isArray(payload.images) ? payload.images.map(String).map((x) => x.trim()).filter(Boolean) : [];
  return {
    name: String(payload.name || '').trim(),
    description: String(payload.description || '').trim(),
    price: Number(payload.price || 0),
    image_url: payload.image || images[0] || '',
    images,
    tag: payload.tag || null,
    button_text: payload.buttonText || 'Comprar',
    stock: Number(payload.stock || 0),
    extra: payload.extra && typeof payload.extra === 'object' ? payload.extra : {},
    is_active: true,
    updated_at: new Date().toISOString()
  };
}

function isUuid(value) {
  return /^[0-9a-f-]{36}$/i.test(String(value || ''));
}

async function syncProductCategories(productId, categoryNames = []) {
  await sbFetch(`product_categories?product_id=eq.${encodeURIComponent(productId)}`, { method: 'DELETE' });
  const wanted = new Set((categoryNames || []).map((x) => String(x || '').trim()).filter(Boolean));
  if (!wanted.size) return;

  const categories = await sbFetch('categories?select=id,name,slug');
  const rows = [];
  for (const name of wanted) {
    let category = (categories || []).find((c) => String(c.name).toLowerCase() === name.toLowerCase());
    if (!category) {
      const created = await sbFetch('categories', {
        method: 'POST',
        body: JSON.stringify({ name, slug: slugify(name) })
      });
      category = Array.isArray(created) ? created[0] : created;
    }
    if (category?.id) rows.push({ product_id: productId, category_id: category.id });
  }
  if (rows.length) {
    await sbFetch('product_categories', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify(rows)
    });
  }
}

module.exports = async (req, res) => {
  try {
    assertAdmin(req);

    if (req.method === 'POST') {
      const payload = dbProduct(req.body || {});
      if (!payload.name || payload.price <= 0) return res.status(400).json({ success: false, message: 'Nome e preço válido são obrigatórios.' });
      const created = await sbFetch('products', { method: 'POST', body: JSON.stringify(payload) });
      const product = Array.isArray(created) ? created[0] : created;
      await syncProductCategories(product.id, req.body.categories || []);
      return res.status(200).json({ success: true, data: product });
    }

    if (req.method === 'PATCH') {
      const { id } = req.body || {};
      if (!isUuid(id)) return res.status(400).json({ success: false, message: 'id do produto é inválido.' });
      const payload = dbProduct(req.body || {});
      if (!payload.name || payload.price <= 0) return res.status(400).json({ success: false, message: 'Nome e preço válido são obrigatórios.' });
      const updated = await sbFetch(`products?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
      await syncProductCategories(id, req.body.categories || []);
      return res.status(200).json({ success: true, data: Array.isArray(updated) ? updated[0] : updated });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query?.id || '').trim();
      if (!isUuid(id)) return res.status(400).json({ success: false, message: 'id do produto é inválido.' });
      await sbFetch(`product_categories?product_id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      try {
        await sbFetch(`products?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
        return res.status(200).json({ success: true, data: { deleted: true, mode: 'hard' } });
      } catch (error) {
        const message = String(error.message || '').toLowerCase();
        if (!message.includes('foreign key') && !message.includes('violates')) throw error;
        await sbFetch(`products?id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: JSON.stringify({ is_active: false, updated_at: new Date().toISOString() })
        });
        return res.status(200).json({ success: true, data: { deleted: true, mode: 'soft' } });
      }
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || 'Erro interno' });
  }
};
