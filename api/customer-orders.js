const { getEnv, sbFetch } = require('./_admin-common');

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 20;
const attempts = new Map();

function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function getClientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0]
    .trim();
}

function checkRateLimit(req, userId) {
  const key = `${getClientIp(req)}:${userId || 'anon'}`;
  const now = Date.now();
  const current = attempts.get(key) || { count: 0, resetAt: now + WINDOW_MS };
  if (now > current.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  current.count += 1;
  attempts.set(key, current);
  return current.count <= MAX_ATTEMPTS;
}

async function getAuthenticatedUser(req) {
  const auth = String(req.headers.authorization || req.headers.Authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) {
    const err = new Error('Faça login para continuar.');
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

function normalizeOrderItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > 20) {
    const err = new Error('Itens do pedido inválidos.');
    err.status = 400;
    throw err;
  }

  return items.map((item) => {
    const productId = String(item.product || item.product_id || item.id || '').trim();
    if (!/^[0-9a-f-]{36}$/i.test(productId)) {
      const err = new Error('Produto inválido no carrinho.');
      err.status = 400;
      throw err;
    }
    return {
      product_id: productId,
      quantity: Math.min(50, Math.max(1, Math.floor(Number(item.quantity || 1))))
    };
  });
}

function normalizeAddress(address = {}) {
  const normalized = {
    street: String(address.street || '').trim().slice(0, 180),
    number: String(address.number || '').trim().slice(0, 30),
    complement: String(address.complement || '').trim().slice(0, 120),
    neighborhood: String(address.neighborhood || '').trim().slice(0, 120),
    city: String(address.city || '').trim().slice(0, 120),
    state: String(address.state || '').trim().slice(0, 2).toUpperCase(),
    cep: String(address.cep || '').replace(/\D/g, '')
  };

  if (!normalized.street || !normalized.number || !normalized.neighborhood || !normalized.city || normalized.state.length !== 2 || normalized.cep.length !== 8) {
    const err = new Error('Endereço incompleto para finalizar o pedido.');
    err.status = 400;
    throw err;
  }
  return normalized;
}

async function calculateAuthoritativeShipping(address, products, subtotal) {
  const token = getEnv('MELHOR_ENVIO_TOKEN');
  const fromCep = String(getEnv('STORE_FROM_CEP') || '').replace(/\D/g, '');
  const toCep = String(address?.cep || '').replace(/\D/g, '');
  if (!token || fromCep.length !== 8 || toCep.length !== 8) return null;

  const baseUrl = getEnv('MELHOR_ENVIO_BASE_URL') || 'https://www.melhorenvio.com.br';
  const userAgent = getEnv('MELHOR_ENVIO_USER_AGENT') || 'Fanjoy (suporte@fanjoy.com)';
  const quantity = Math.min(50, Math.max(1, products.reduce((sum, item) => sum + Number(item.quantity || 0), 0)));
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
    .map((item) => [Number(item.price || 0), Number(item.custom_price || 0)]
      .filter((value) => Number.isFinite(value) && value > 0)
      .sort((a, b) => a - b)[0] || 0)
    .filter((value) => value > 0)
    .sort((a, b) => a - b)[0];

  if (!cheapest) {
    const err = new Error('Nenhuma opção de frete válida foi encontrada. Recalcule antes de finalizar.');
    err.status = 400;
    throw err;
  }

  return money(cheapest);
}

async function createOrder(req, res, user) {
  const body = req.body || {};
  const items = normalizeOrderItems(body.items || []);
  const address = normalizeAddress(body.shippingAddress || {});

  const customerRows = await sbFetch(`customers?user_id=eq.${encodeURIComponent(user.id)}&select=id`);
  const customer = customerRows?.[0];
  if (!customer?.id) return res.status(400).json({ success: false, message: 'Perfil do cliente não encontrado.' });

  const ids = [...new Set(items.map((item) => item.product_id))];
  const products = await sbFetch(`products?id=in.(${ids.map(encodeURIComponent).join(',')})&select=id,name,price,is_active`);
  const productMap = new Map((products || []).map((product) => [String(product.id), product]));
  if (productMap.size !== ids.length || [...productMap.values()].some((product) => product.is_active === false)) {
    return res.status(400).json({ success: false, message: 'Produto indisponível. Refaça o carrinho.' });
  }

  const authoritativeItems = items.map((item) => {
    const product = productMap.get(item.product_id);
    return {
      product_id: item.product_id,
      quantity: item.quantity,
      price: money(product.price)
    };
  });
  const subtotal = money(authoritativeItems.reduce((sum, item) => sum + item.quantity * item.price, 0));
  const shipping = money(body.shipping);
  const expectedShipping = await calculateAuthoritativeShipping(address, authoritativeItems, subtotal);

  if (expectedShipping !== null && shipping + 0.25 < expectedShipping) {
    return res.status(400).json({ success: false, message: 'Frete divergente. Recalcule o frete antes de finalizar.' });
  }
  if (subtotal <= 0 || shipping < 0) {
    return res.status(400).json({ success: false, message: 'Valores do pedido inválidos.' });
  }

  const total = money(subtotal + shipping);
  const orderNumber = `FAJ-${Date.now().toString().slice(-8)}`;
  const created = await sbFetch('orders', {
    method: 'POST',
    body: JSON.stringify({
      customer_id: customer.id,
      order_number: orderNumber,
      status: 'pending',
      payment_status: 'pending',
      shipping_address: address,
      subtotal,
      shipping,
      total
    })
  });
  const order = Array.isArray(created) ? created[0] : created;
  if (!order?.id) return res.status(500).json({ success: false, message: 'Pedido não foi criado.' });

  await sbFetch('order_items', {
    method: 'POST',
    body: JSON.stringify(authoritativeItems.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price
    })))
  });

  return res.status(200).json({
    success: true,
    data: {
      _id: order.id,
      id: order.id,
      orderNumber: order.order_number,
      subtotal,
      shipping,
      total,
      status: order.status,
      createdAt: order.created_at
    }
  });
}

async function cancelOrder(req, res, user) {
  const id = String(req.body?.orderId || req.body?.id || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return res.status(400).json({ success: false, message: 'Pedido inválido.' });
  }

  const rows = await sbFetch(
    `orders?id=eq.${encodeURIComponent(id)}&select=id,status,payment_status,customers(user_id)`
  );
  const order = rows?.[0];
  if (!order || order.customers?.user_id !== user.id) {
    return res.status(403).json({ success: false, message: 'Pedido não autorizado.' });
  }

  const status = String(order.status || '').toLowerCase();
  const paymentStatus = String(order.payment_status || '').toLowerCase();
  const canCancel = status === 'pending' && ['pending', 'in_process'].includes(paymentStatus);
  if (!canCancel) {
    return res.status(400).json({ success: false, message: 'Este pedido não pode mais ser cancelado.' });
  }

  await sbFetch(`orders?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'cancelled', payment_status: 'cancelled' })
  });
  return res.status(200).json({ success: true, data: { cancelled: true } });
}

module.exports = async (req, res) => {
  if (!['POST', 'PATCH'].includes(req.method)) {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const user = await getAuthenticatedUser(req);
    if (!checkRateLimit(req, user.id)) {
      return res.status(429).json({ success: false, message: 'Muitas tentativas. Aguarde alguns minutos.' });
    }

    if (req.method === 'POST') return await createOrder(req, res, user);
    return await cancelOrder(req, res, user);
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || 'Erro interno' });
  }
};
