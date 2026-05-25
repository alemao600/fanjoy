const { sbFetch, assertAdmin } = require('./_admin-common');

module.exports = async (req, res) => {
  try {
    assertAdmin(req);

    if (req.method === 'GET') {
      const orders = await sbFetch("orders?select=id,order_number,status,payment_status,shipping_address,subtotal,shipping,total,tracking_code,created_at,customers(name,email,phone),order_items(id,quantity,price,products(name))&order=created_at.desc");
      return res.status(200).json({ success: true, data: { orders: orders || [] } });
    }

    if (req.method === 'PATCH') {
      const { id, status, payment_status, tracking_code } = req.body || {};
      if (!id) return res.status(400).json({ success: false, message: 'id do pedido é obrigatório' });

      const payload = {};
      if (typeof status === 'string' && status) payload.status = status;
      if (typeof payment_status === 'string' && payment_status) payload.payment_status = payment_status;
      if (typeof tracking_code === 'string') payload.tracking_code = tracking_code.trim() || null;

      if (!Object.keys(payload).length) {
        return res.status(400).json({ success: false, message: 'Nenhum campo para atualizar' });
      }

      const updated = await sbFetch(`orders?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });

      return res.status(200).json({ success: true, data: updated?.[0] || null });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ success: false, message: error.message || 'Erro interno' });
  }
};
