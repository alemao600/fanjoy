const { getEnv, sbFetch } = require('./_admin-common');

function mapPaymentStatus(status) {
  if (status === 'approved') return { payment_status: 'approved', status: 'paid' };
  if (status === 'pending' || status === 'in_process') return { payment_status: 'pending', status: 'pending' };
  if (status === 'rejected' || status === 'cancelled') return { payment_status: 'failed', status: 'cancelled' };
  return { payment_status: 'pending', status: 'pending' };
}

function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  try {
    const mpToken = getEnv('MP_ACCESS_TOKEN');
    if (!mpToken) return res.status(500).json({ success: false, message: 'MP_ACCESS_TOKEN não configurado' });

    const body = req.body || {};
    const paymentId = body?.data?.id || body?.id || null;
    const topic = body?.type || body?.topic || req.query?.type || req.query?.topic || '';

    if (!paymentId || (topic && topic !== 'payment')) {
      return res.status(200).json({ success: true, message: 'Evento ignorado' });
    }

    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mpToken}` }
    });
    const payment = await paymentRes.json();
    if (!paymentRes.ok) {
      return res.status(500).json({ success: false, message: payment.message || 'Erro ao consultar pagamento' });
    }

    const orderRef = String(payment.external_reference || '').trim();
    if (!orderRef || !/^[0-9a-f-]{36}$/i.test(orderRef)) {
      return res.status(200).json({ success: true, message: 'Sem external_reference' });
    }

    const mapped = mapPaymentStatus(payment.status);
    const orders = await sbFetch(`orders?id=eq.${encodeURIComponent(orderRef)}&select=id,total`);
    const order = orders?.[0] || null;
    if (!order) {
      return res.status(200).json({ success: true, message: 'Pedido não encontrado' });
    }

    if (mapped.status === 'paid') {
      const paidAmount = money(payment.transaction_amount || payment.total_paid_amount || 0);
      const expectedTotal = money(order.total);
      if (Math.abs(paidAmount - expectedTotal) > 0.02) {
        return res.status(200).json({
          success: true,
          message: 'Pagamento ignorado: valor diferente do pedido'
        });
      }
    }

    // external_reference no checkout recebe orderId (uuid)
    const updated = await sbFetch(`orders?id=eq.${encodeURIComponent(orderRef)}`, {
      method: 'PATCH',
      body: JSON.stringify(mapped)
    });

    return res.status(200).json({ success: true, data: updated?.[0] || null });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Erro interno webhook' });
  }
};
