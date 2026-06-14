let cart = [];
let selectedShipping = null;
let shippingCep = "";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

document.addEventListener('DOMContentLoaded', () => {
  loadCart();
  loadSavedShipping();
  renderCart();
  checkCheckoutRedirect();
});

function loadCart() {
  cart = (JSON.parse(localStorage.getItem('fanjoy_cart')) || []).map((item) => ({
    ...item,
    cartKey: item.cartKey || `${item.id}::${item.size || ''}`
  }));
}

function saveCart() {
  localStorage.setItem('fanjoy_cart', JSON.stringify(cart));
}

function loadSavedShipping() {
  try {
    const raw = JSON.parse(localStorage.getItem('fanjoy_shipping') || 'null');
    if (!raw) return;
    selectedShipping = raw.selectedShipping || null;
    shippingCep = raw.shippingCep || "";
    const cepInput = document.getElementById('shippingCep');
    if (cepInput && shippingCep) cepInput.value = shippingCep;
  } catch (_) {}
}

function saveShippingState() {
  localStorage.setItem('fanjoy_shipping', JSON.stringify({ selectedShipping, shippingCep }));
}

function renderCart() {
  const cartItems = document.getElementById('cartItems');
  const summary = document.getElementById('cartSummary');
  if (!cartItems) return;

  if (!cart.length) {
    cartItems.innerHTML = `
      <div class="empty">
        <h3>Seu carrinho está vazio</h3>
        <p style="margin-top:8px;">Adicione produtos para continuar</p>
      </div>
    `;
    if (summary) summary.style.display = 'none';
    return;
  }

  if (summary) summary.style.display = 'block';

  cartItems.innerHTML = cart.map((item) => `
    <div class="item">
      <img src="${item.image || ''}" alt="${escapeHtml(item.name)}">
      <div style="flex:1;">
        <h4>${escapeHtml(item.name)}</h4>
        ${item.size ? `<p>Tamanho: ${escapeHtml(item.size)}</p>` : ''}
        <p>Preço unitário: R$ ${Number(item.price).toFixed(2)}</p>
        <div class="qty">
          <button onclick="updateQuantity('${item.cartKey}', ${Number(item.quantity) - 1})">-</button>
          <strong>${item.quantity}</strong>
          <button onclick="updateQuantity('${item.cartKey}', ${Number(item.quantity) + 1})">+</button>
        </div>
        <button class="remove" onclick="removeFromCart('${item.cartKey}')">Remover</button>
      </div>
      <div style="font-weight:800;">R$ ${(Number(item.price) * Number(item.quantity)).toFixed(2)}</div>
    </div>
  `).join('');

  updateCartSummary();
}

function updateQuantity(cartKey, newQuantity) {
  if (newQuantity < 1) {
    removeFromCart(cartKey);
    return;
  }
  const target = cart.find((x) => String(x.cartKey) === String(cartKey));
  if (!target) return;
  target.quantity = newQuantity;
  saveCart();
  renderCart();
}

function removeFromCart(cartKey) {
  cart = cart.filter((x) => String(x.cartKey) !== String(cartKey));
  saveCart();
  renderCart();
}

function normalizeCep(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function getProductsForShipping() {
  const totalQty = cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0) || 1;
  return [{
    id: 'camiseta-bts',
    width: 25,
    height: 3,
    length: 30,
    weight: 0.3,
    insurance_value: cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity || 1), 0),
    quantity: totalQty
  }];
}

async function calculateShipping() {
  if (!cart.length) {
    alert('Seu carrinho está vazio.');
    return;
  }

  const cepInput = document.getElementById('shippingCep');
  const statusEl = document.getElementById('shippingStatus');
  if (!cepInput || !statusEl) return;

  shippingCep = normalizeCep(cepInput.value);
  cepInput.value = shippingCep;

  if (shippingCep.replace(/\D/g, '').length !== 8) {
    statusEl.textContent = 'Digite um CEP válido com 8 números.';
    return;
  }

  statusEl.textContent = 'Calculando frete real...';

  const resp = await fetch('/api/shipping-quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: { postal_code: shippingCep.replace(/\D/g, '') },
      products: getProductsForShipping()
    })
  });

  const data = await resp.json();
  if (!resp.ok || !data.success) {
    statusEl.textContent = data.message || 'Erro ao calcular frete.';
    selectedShipping = null;
    saveShippingState();
    updateCartSummary();
    return;
  }

  const options = data.data?.options || [];
  if (!options.length) {
    statusEl.textContent = 'Nenhuma opção de frete encontrada para este CEP.';
    selectedShipping = null;
    saveShippingState();
    updateCartSummary();
    return;
  }

  selectedShipping = options.reduce((min, opt) => {
    if (!min) return opt;
    return Number(opt.price || 0) < Number(min.price || 0) ? opt : min;
  }, null);
  statusEl.textContent = selectedShipping
    ? `Frete calculado: R$ ${Number(selectedShipping.price || 0).toFixed(2)} • prazo ${selectedShipping.delivery_time || '-'} dia(s) úteis`
    : 'Não foi possível calcular o frete.';
  saveShippingState();
  updateCartSummary();
}

function updateCartSummary() {
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  const shipping = selectedShipping ? Number(selectedShipping.price || 0) : 0;
  const total = subtotal + shipping;
  const eta = selectedShipping?.delivery_time ? `${selectedShipping.delivery_time} dia(s) úteis` : '-';

  document.getElementById('subtotalValue').textContent = `R$ ${subtotal.toFixed(2)}`;
  document.getElementById('shippingValue').textContent = selectedShipping ? `R$ ${shipping.toFixed(2)}` : 'Calcule o frete';
  document.getElementById('shippingEta').textContent = selectedShipping ? eta : '-';
  document.getElementById('totalValue').textContent = `R$ ${total.toFixed(2)}`;
}

async function checkout() {
  if (!cart.length) {
    alert('Seu carrinho está vazio.');
    return;
  }

  if (!selectedShipping) {
    alert('Calcule e selecione um frete real antes de pagar.');
    return;
  }

  let customer = null;
  let profileResponse = await FanjoyAPI.Customers.getProfile();
  if (!profileResponse.success) {
    // Retry once after a short delay to allow auth session recovery.
    await new Promise((resolve) => setTimeout(resolve, 250));
    profileResponse = await FanjoyAPI.Customers.getProfile();
  }
  if (!profileResponse.success) {
    sessionStorage.setItem('fanjoy_checkout_redirect', 'true');
    sessionStorage.setItem('fanjoy_after_login_redirect', 'cart.html');
    alert('Faça login para finalizar a compra.');
    window.location.href = 'customer-login.html?next=cart.html';
    return;
  }
  customer = profileResponse.data;
  sessionStorage.setItem('fanjoy_customer_logged', 'true');
  sessionStorage.setItem('fanjoy_customer_id', customer._id || customer.id || '');
  sessionStorage.setItem('fanjoy_customer_name', customer.name || 'Cliente');

  const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  const shipping = Number(selectedShipping.price || 0);
  const total = subtotal + shipping;

  if (!customer.addresses || !customer.addresses.length) {
    alert('Adicione um endereço no seu perfil antes de pagar.');
    window.location.href = 'customer-profile.html';
    return;
  }

  const defaultAddress = customer.addresses.find((a) => a.isDefault) || customer.addresses[0];
  const fullName = `${customer.name || ""} ${customer.lastName || ""}`.trim();
  const orderResp = await FanjoyAPI.Orders.create({
    items: cart.map((item) => ({
      product: item.id,
      quantity: Number(item.quantity),
      price: Number(item.price)
    })),
    shippingAddress: {
      street: defaultAddress.street,
      number: defaultAddress.number,
      complement: defaultAddress.complement || '',
      neighborhood: defaultAddress.neighborhood,
      city: defaultAddress.city,
      state: defaultAddress.state,
      cep: defaultAddress.cep
    },
    subtotal,
    shipping,
    total
  });

  if (!orderResp.success) {
    alert(`Erro ao criar pedido: ${orderResp.message || 'tente novamente.'}`);
    return;
  }

  const orderId = orderResp.data._id || orderResp.data.id;

  const baseUrl = window.location.origin;
  const accessToken = await FanjoyAPI.Auth.getAccessToken();
  if (!accessToken) {
    alert('Sessão expirada. Faça login novamente.');
    window.location.href = 'customer-login.html?next=cart.html';
    return;
  }
  const resp = await fetch('/api/create-preference', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      orderId,
      customerEmail: customer?.email || null,
      successUrl: `${baseUrl}/customer-profile.html?payment=success`,
      failureUrl: `${baseUrl}/cart.html?payment=failure`,
      pendingUrl: `${baseUrl}/cart.html?payment=pending`,
      items: [
        ...cart.map((item) => ({
          title: item.size ? `${item.name} - Tam. ${item.size}` : item.name,
          quantity: Number(item.quantity),
          unit_price: Number(item.price)
        })),
        {
          title: `Frete - ${selectedShipping.name || 'Entrega'}`,
          quantity: 1,
          unit_price: shipping
        }
      ],
      payer: {
        email: customer?.email || null,
        first_name: customer?.name || null,
        last_name: customer?.lastName || null,
        full_name: fullName || null,
        phone: customer?.phone || null,
        cpf: customer?.cpf || null,
        address: {
          zip_code: (defaultAddress.cep || "").replace(/\D/g, ""),
          street_name: defaultAddress.street || null,
          street_number: String(defaultAddress.number || ""),
          neighborhood: defaultAddress.neighborhood || null,
          city: defaultAddress.city || null,
          federal_unit: defaultAddress.state || null
        }
      },
      shipping: {
        cep: shippingCep,
        service: selectedShipping.name,
        price: shipping
      }
    })
  });

  const data = await resp.json();
  if (!resp.ok || !data.success) {
    alert(data.message || 'Erro ao iniciar pagamento no Mercado Pago.');
    return;
  }

  localStorage.removeItem('fanjoy_cart');
  localStorage.removeItem('fanjoy_shipping');
  window.location.href = data.data.init_point;
}

function checkCheckoutRedirect() {
  if (sessionStorage.getItem('fanjoy_checkout_redirect') === 'true') {
    sessionStorage.removeItem('fanjoy_checkout_redirect');
  }
}
