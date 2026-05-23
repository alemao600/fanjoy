let cart = [];

document.addEventListener('DOMContentLoaded', () => {
  loadCart();
  renderCart();
  checkCheckoutRedirect();
});

function loadCart() {
  cart = JSON.parse(localStorage.getItem('fanjoy_cart')) || [];
}

function saveCart() {
  localStorage.setItem('fanjoy_cart', JSON.stringify(cart));
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
      <img src="${item.image || ''}" alt="${item.name}">
      <div style="flex:1;">
        <h4>${item.name}</h4>
        <p>Preço unitário: R$ ${Number(item.price).toFixed(2)}</p>
        <div class="qty">
          <button onclick="updateQuantity('${item.id}', ${Number(item.quantity) - 1})">-</button>
          <strong>${item.quantity}</strong>
          <button onclick="updateQuantity('${item.id}', ${Number(item.quantity) + 1})">+</button>
        </div>
        <button class="remove" onclick="removeFromCart('${item.id}')">Remover</button>
      </div>
      <div style="font-weight:800;">R$ ${(Number(item.price) * Number(item.quantity)).toFixed(2)}</div>
    </div>
  `).join('');

  updateCartSummary();
}

function updateQuantity(productId, newQuantity) {
  if (newQuantity < 1) {
    removeFromCart(productId);
    return;
  }
  const target = cart.find((x) => String(x.id) === String(productId));
  if (!target) return;
  target.quantity = newQuantity;
  saveCart();
  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter((x) => String(x.id) !== String(productId));
  saveCart();
  renderCart();
}

function updateCartSummary() {
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  const shipping = subtotal >= 200 ? 0 : 15;
  const total = subtotal + shipping;

  document.getElementById('subtotalValue').textContent = `R$ ${subtotal.toFixed(2)}`;
  document.getElementById('shippingValue').textContent = shipping === 0 ? 'GRÁTIS' : `R$ ${shipping.toFixed(2)}`;
  document.getElementById('totalValue').textContent = `R$ ${total.toFixed(2)}`;
}

async function checkout() {
  if (!cart.length) {
    alert('Seu carrinho está vazio.');
    return;
  }

  // Checkout guest: tenta perfil, mas não bloqueia pagamento se sessão falhar
  let customer = null;
  const profileResponse = await FanjoyAPI.Customers.getProfile();
  if (profileResponse.success) {
    customer = profileResponse.data;
    sessionStorage.setItem('fanjoy_customer_logged', 'true');
    sessionStorage.setItem('fanjoy_customer_id', customer._id || customer.id || '');
    sessionStorage.setItem('fanjoy_customer_name', customer.name || 'Cliente');
  }
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  const shipping = subtotal >= 200 ? 0 : 15;
  const total = subtotal + shipping;

  // Se tiver perfil+endereço, cria pedido no Supabase. Se não tiver, segue como guest.
  let orderId = `guest-${Date.now()}`;
  if (customer && customer.addresses && customer.addresses.length > 0) {
    const defaultAddress = customer.addresses.find((a) => a.isDefault) || customer.addresses[0];
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

    if (orderResp.success) {
      orderId = orderResp.data._id || orderResp.data.id || orderId;
    }
  }

  const baseUrl = window.location.origin;
  const resp = await fetch('/api/create-preference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId,
      customerEmail: customer?.email || null,
      successUrl: `${baseUrl}/customer-profile.html?payment=success`,
      failureUrl: `${baseUrl}/cart.html?payment=failure`,
      pendingUrl: `${baseUrl}/cart.html?payment=pending`,
      items: cart.map((item) => ({
        title: item.name,
        quantity: Number(item.quantity),
        unit_price: Number(item.price)
      }))
    })
  });

  const data = await resp.json();
  if (!resp.ok || !data.success) {
    alert(data.message || 'Erro ao iniciar pagamento no Mercado Pago.');
    return;
  }

  localStorage.removeItem('fanjoy_cart');
  window.location.href = data.data.init_point;
}

function checkCheckoutRedirect() {
  if (sessionStorage.getItem('fanjoy_checkout_redirect') === 'true') {
    sessionStorage.removeItem('fanjoy_checkout_redirect');
  }
}



