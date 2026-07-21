const { getEnv, sbFetch } = require('./_admin-common');

function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function resolveBaseUrl(req) {
  const rawHost = String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  const allowedHosts = new Set([
    'fanjoy.com.br',
    'www.fanjoy.com.br',
    'fanjoy-fawn.vercel.app',
    'localhost:4173',
    'localhost:3000'
  ]);
  if (!allowedHosts.has(rawHost)) {
    const err = new Error('Origem do checkout inválida');
    err.status = 400;
    throw err;
  }
  const proto = rawHost.startsWith('localhost:') ? 'http' : 'https';
  return `${proto}://${rawHost}`;
}

async function calculateAuthoritativeShipping(address, orderItems, subtotal) {
  const token = getEnv('MELHOR_ENVIO_TOKEN');
  const fromCep = String(getEnv('STORE_FROM_CEP') || '').replace(/\D/g, '');
  const toCep = String(address?.cep || '').replace(/\D/g, '');
  if (!token || fromCep.length !== 8 || toCep.length !== 8) return null;

  const baseUrl = getEnv('MELHOR_ENVIO_BASE_URL') || 'https://www.melhorenvio.com.br';
  const userAgent = getEnv('MELHOR_ENVIO_USER_AGENT') || 'Fanjoy (suporte@fanjoy.com)';
  const quantity = Math.min(50, Math.max(1, orderItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0)));
  const payload = {
    from: { postal_code: fromCep },
    to: { postal_code: toCep },
    products: [{
      id: 'fanjoy-order',
      width: 25,
      height: 3,
      length: 30,
      weight: 0.3,
      insurance_value: Math.min(10000, Math.max(0, Number(subtotal || 0))),
      quantity
    }]
  };

  const response = await fetch(`${baseUrl}/api/v2/me/shipment/calculate`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'User-Agent': userAgent
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(data)) {
    const err = new Error('Não foi possível validar o frete. Recalcule antes de finalizar.');
    err.status = 400;
    throw err;
  }

  const cheapest = data
    .filter((item) => !item.error)
    .map((item) => {
      const prices = [Number(item.price || 0), Number(item.custom_price || 0)]
        .filter((value) => Number.isFinite(value) && value > 0);
      return prices.length ? Math.min(...prices) : 0;
    })
    .filter((value) => value > 0)
    .sort((a, b) => a - b)[0];

  if (!cheapest) {
    const err = new Error('Nenhuma opção de frete válida foi encontrada. Recalcule antes de finalizar.');
    err.status = 400;
    throw err;
  }

  return money(cheapest);
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
      `orders?id=eq.${encodeURIComponent(orderId)}&select=id,total,subtotal,shipping,shipping_address,customers(user_id,email,name,last_name,phone,cpf),order_items(quantity,price,products(name,price,is_active))`
    );
    const order = orders?.[0];

    if (!order || order.customers?.user_id !== user.id) {
      return res.status(403).json({ success: false, message: 'Pedido não autorizado' });
    }

    const orderItems = Array.isArray(order.order_items) ? order.order_items : [];
    if (!orderItems.length) {
      return res.status(400).json({ success: false, message: 'Pedido sem itens' });
    }
    if (orderItems.some((item) => item.products?.is_active === false)) {
      return res.status(400).json({ success: false, message: 'Produto indisponível. Refaça o carrinho.' });
    }

    const authoritativeSubtotal = money(orderItems.reduce((sum, item) => {
      return sum + Math.max(1, Number(item.quantity || 1)) * money(item.products?.price);
    }, 0));
    if (authoritativeSubtotal <= 0 || Math.abs(authoritativeSubtotal - money(order.subtotal)) > 0.02) {
      return res.status(400).json({
        success: false,
        message: 'Preço do pedido divergente. Refaça o carrinho antes de finalizar.'
      });
    }

    const baseUrl = resolveBaseUrl(req);
    const webhookUrl = `${baseUrl}/api/mp-webhook`;
    const customer = order.customers || {};
    const address = order.shipping_address || {};
    const shipping = money(order.shipping);
    const expectedShipping = await calculateAuthoritativeShipping(address, orderItems, money(order.subtotal));
    if (expectedShipping !== null && shipping + 0.25 < expectedShipping) {
      return res.status(400).json({
        success: false,
        message: 'Frete divergente. Recalcule o frete antes de finalizar a compra.'
      });
    }
    if (Math.abs(money(order.total) - money(authoritativeSubtotal + shipping)) > 0.02) {
      return res.status(400).json({
        success: false,
        message: 'Total do pedido divergente. Refaça o carrinho antes de finalizar.'
      });
    }

    const payload = {
      items: [
        ...orderItems.map((item) => ({
          title: item.products?.name || 'Produto',
          quantity: Math.max(1, Number(item.quantity || 1)),
          unit_price: money(item.products?.price),
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
