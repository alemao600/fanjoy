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
      if (!id || !/^[0-9a-f-]{36}$/i.test(String(id))) {
        return res.status(400).json({ success: false, message: 'id do pedido é inválido' });
      }

      const payload = {};
      const allowedStatuses = new Set(['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled']);
      const allowedPayments = new Set(['pending', 'approved', 'paid', 'cancelled', 'failed', 'rejected', 'in_process']);
      if (typeof status === 'string' && status) {
        const normalized = status.toLowerCase();
        if (!allowedStatuses.has(normalized)) {
          return res.status(400).json({ success: false, message: 'Status inválido' });
        }
        payload.status = normalized;
      }
      if (typeof payment_status === 'string' && payment_status) {
        const normalizedPayment = payment_status.toLowerCase();
        if (!allowedPayments.has(normalizedPayment)) {
          return res.status(400).json({ success: false, message: 'Status de pagamento inválido' });
        }
        payload.payment_status = normalizedPayment;
      }
      if (typeof tracking_code === 'string') payload.tracking_code = tracking_code.trim() || null;

      // Keep payment state aligned when admin updates order status.
      if (!payload.payment_status && payload.status) {
        const normalized = String(payload.status).toLowerCase();
        if (normalized === 'cancelled') payload.payment_status = 'cancelled';
        else if (['paid', 'processing', 'shipped', 'delivered'].includes(normalized)) payload.payment_status = 'approved';
        else if (normalized === 'pending') payload.payment_status = 'pending';
      }

      if (!Object.keys(payload).length) {
        return res.status(400).json({ success: false, message: 'Nenhum campo para atualizar' });
      }

      const updated = await sbFetch(`orders?id=eq.${encodeURIComponent(String(id))}`, {
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
