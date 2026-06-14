const { getEnv, sbFetch } = require('./_admin-common');

function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

async function getAuthenticatedUser(req) {
  const auth = String(req.headers.authorization || req.headers.Authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) {
    const err = new Error('Faça login para finalizar a compra.');
    err.status = 401;
    throw err;
  }

  const url = getEnv('SUPABASE_URL') || getEnv('FANJOY_SUPABASE_URL') || '';
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !key) throw new Error('Supabase não configurado');

  const resp = await fetch(`${url.replace(/\/$/, '')}/auth/v1/user`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`
    }
  });
  const user = await resp.json().catch(() => null);
  if (!resp.ok || !user?.id) {
    const err = new Error('Sessão inválida. Faça login novamente.');
    err.status = 401;
    throw err;
  }
  return user;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) {
      return res.status(500).json({ success: false, message: 'MP_ACCESS_TOKEN não configurado' });
    }

    const user = await getAuthenticatedUser(req);
    const { orderId } = req.body || {};

    if (!orderId || !/^[0-9a-f-]{36}$/i.test(String(orderId))) {
      return res.status(400).json({ success: false, message: 'Pedido inválido' });
    }

    const orders = await sbFetch(
      `orders?id=eq.${encodeURIComponent(orderId)}&select=id,total,subtotal,shipping,shipping_address,customers(user_id,email,name,last_name,phone,cpf),order_items(quantity,price,products(name))`
    );
    const order = orders?.[0];

    if (!order || order.customers?.user_id !== user.id) {
      return res.status(403).json({ success: false, message: 'Pedido não autorizado' });
    }

    const orderItems = Array.isArray(order.order_items) ? order.order_items : [];
    if (!orderItems.length) {
      return res.status(400).json({ success: false, message: 'Pedido sem itens' });
    }

    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const baseUrl = host ? `${proto}://${host}` : '';
    const webhookUrl = host ? `${baseUrl}/api/mp-webhook` : undefined;
    const customer = order.customers || {};
    const address = order.shipping_address || {};
    const shipping = money(order.shipping);

    const payload = {
      items: [
        ...orderItems.map((item) => ({
          title: item.products?.name || 'Produto',
          quantity: Math.max(1, Number(item.quantity || 1)),
          unit_price: money(item.price),
          currency_id: 'BRL'
        })),
        ...(shipping > 0
          ? [{
              title: 'Frete',
              quantity: 1,
              unit_price: shipping,
              currency_id: 'BRL'
            }]
          : [])
      ],
      external_reference: String(order.id),
      payer: {
        email: customer.email || user.email || undefined,
        first_name: customer.name || undefined,
        last_name: customer.last_name || undefined,
        phone: customer.phone
          ? {
              area_code: String(customer.phone).replace(/\D/g, '').slice(0, 2) || undefined,
              number: String(customer.phone).replace(/\D/g, '').slice(2) || undefined
            }
          : undefined,
        identification: customer.cpf
          ? {
              type: 'CPF',
              number: String(customer.cpf).replace(/\D/g, '')
            }
          : undefined,
        address: {
          zip_code: String(address.cep || '').replace(/\D/g, '') || undefined,
          street_name: address.street || undefined,
          street_number: String(address.number || '') || undefined
        }
      },
      back_urls: {
        success: `${baseUrl}/customer-profile.html?payment=success`,
        failure: `${baseUrl}/cart.html?payment=failure`,
        pending: `${baseUrl}/cart.html?payment=pending`
      },
      notification_url: webhookUrl,
      auto_return: 'approved',
      metadata: {
        order_id: String(order.id),
        subtotal: money(order.subtotal),
        shipping
      }
    };

    if (!payload.items.every((item) => item.quantity > 0 && item.unit_price > 0 && item.unit_price < 100000)) {
      return res.status(400).json({ success: false, message: 'Valores do pedido inválidos' });
    }

    const calculatedTotal = money(payload.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0));
    if (Math.abs(calculatedTotal - money(order.total)) > 0.02) {
      return res.status(400).json({ success: false, message: 'Total do pedido divergente' });
    }

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await mpRes.json();
    if (!mpRes.ok) {
      return res.status(500).json({ success: false, message: data.message || 'Erro Mercado Pago', details: data });
    }

    return res.status(200).json({
      success: true,
      data: {
        init_point: data.init_point,
        sandbox_init_point: data.sandbox_init_point,
        preference_id: data.id
      }
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || 'Erro interno' });
  }
};
