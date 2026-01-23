// ========================================
// CART.HTML - Integração com API
// ========================================

let cart = [];

document.addEventListener('DOMContentLoaded', () => {
  loadCart();
  renderCart();
  checkCheckoutRedirect();
});

// ========================================
// Carregar Carrinho
// ========================================

function loadCart() {
  cart = JSON.parse(localStorage.getItem('fanjoy_cart')) || [];
}

function saveCart() {
  localStorage.setItem('fanjoy_cart', JSON.stringify(cart));
  updateCartSummary();
}

// ========================================
// Renderizar Carrinho
// ========================================

function renderCart() {
  const cartItems = document.getElementById('cartItems');
  if (!cartItems) return;

  if (cart.length === 0) {
    cartItems.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: #6b7280;">
        <h3 style="font-size: 24px; margin-bottom: 12px;">Seu carrinho está vazio</h3>
        <p style="margin-bottom: 24px;">Adicione produtos para continuar</p>
        <a href="index.html" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #ff6bce, #7c3aed); color: white; text-decoration: none; border-radius: 12px; font-weight: 600;">
          Ver Produtos
        </a>
      </div>
    `;
    document.getElementById('cartSummary').style.display = 'none';
    return;
  }

  cartItems.innerHTML = cart.map(item => `
    <div class="cart-item" data-item-id="${item.id}">
      <img src="${item.image || 'https://via.placeholder.com/80'}" alt="${item.name}" class="cart-item-image">
      <div class="cart-item-details">
        <h3>${item.name}</h3>
        <p class="cart-item-price">R$ ${item.price.toFixed(2)}</p>
      </div>
      <div class="cart-item-actions">
        <div class="quantity-control">
          <button onclick="updateQuantity('${item.id}', ${item.quantity - 1})">−</button>
          <span>${item.quantity}</span>
          <button onclick="updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
        </div>
        <button class="btn-remove" onclick="removeFromCart('${item.id}')">🗑️ Remover</button>
      </div>
      <div class="cart-item-total">
        R$ ${(item.price * item.quantity).toFixed(2)}
      </div>
    </div>
  `).join('');

  updateCartSummary();
  document.getElementById('cartSummary').style.display = 'block';
}

// ========================================
// Atualizar Quantidade
// ========================================

function updateQuantity(productId, newQuantity) {
  if (newQuantity < 1) {
    removeFromCart(productId);
    return;
  }

  const item = cart.find(i => i.id === productId);
  if (item) {
    item.quantity = newQuantity;
    saveCart();
    renderCart();
  }
}

// ========================================
// Remover do Carrinho
// ========================================

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCart();
  renderCart();
}

// ========================================
// Resumo do Carrinho
// ========================================

function updateCartSummary() {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal >= 200 ? 0 : 15;
  const total = subtotal + shipping;

  document.getElementById('subtotalValue').textContent = `R$ ${subtotal.toFixed(2)}`;
  document.getElementById('shippingValue').textContent = shipping === 0 ? 'GRÁTIS' : `R$ ${shipping.toFixed(2)}`;
  document.getElementById('totalValue').textContent = `R$ ${total.toFixed(2)}`;

  if (shipping === 0) {
    const shippingRow = document.getElementById('shippingValue').parentElement;
    shippingRow.innerHTML = `
      <span>Frete</span>
      <span style="color: #10b981; font-weight: 600;">GRÁTIS ✓</span>
    `;
  }
}

// ========================================
// Finalizar Compra (Integração com API)
// ========================================

async function checkout() {
  if (cart.length === 0) {
    alert('Seu carrinho está vazio!');
    return;
  }

  console.log('🛒 Iniciando checkout...');

  // Verificar se está logado
  const isLogged = FanjoyAPI.Auth.isAuthenticated && FanjoyAPI.Auth.isAuthenticated();
  if (!isLogged) {
    console.log('❌ Usuário não está logado');
    if (confirm('Você precisa fazer login para finalizar a compra. Deseja fazer login agora?')) {
      sessionStorage.setItem('fanjoy_checkout_redirect', 'true');
      window.location.href = 'customer-login.html';
    }
    return;
  }

  console.log('✅ Usuário logado');

  try {
    // Buscar perfil do cliente para obter endereço
    const profileResponse = await FanjoyAPI.Customers.getProfile();
    if (!profileResponse.success) {
      alert('Erro ao carregar perfil. Por favor, faça login novamente.');
      FanjoyAPI.Auth.logout();
      return;
    }

    const customer = profileResponse.data;

    // Verificar se tem endereço
    if (!customer.addresses || customer.addresses.length === 0) {
      alert('Você precisa cadastrar um endereço primeiro!');
      window.location.href = 'customer-profile.html';
      return;
    }

    // Pegar endereço padrão ou primeiro
    const defaultAddress = customer.addresses.find(addr => addr.isDefault) || customer.addresses[0];

    // Calcular valores
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = subtotal >= 200 ? 0 : 15;
    const total = subtotal + shipping;

    // Preparar itens do pedido
    const items = cart.map(item => ({
      product: item.id,
      quantity: item.quantity,
      price: item.price
    }));

    // Criar pedido na API
    const orderData = {
      items: items,
      shippingAddress: {
        street: defaultAddress.street,
        number: defaultAddress.number,
        complement: defaultAddress.complement || '',
        neighborhood: defaultAddress.neighborhood,
        city: defaultAddress.city,
        state: defaultAddress.state,
        cep: defaultAddress.cep
      },
      subtotal: subtotal,
      shipping: shipping,
      total: total
    };

    console.log('Criando pedido:', orderData);

    const orderResponse = await FanjoyAPI.Orders.create(orderData);
    
    if (!orderResponse.success) {
      throw new Error(orderResponse.message || 'Erro ao criar pedido');
    }

    const order = orderResponse.data;
    console.log('Pedido criado:', order);

    // Criar preferência de pagamento no Mercado Pago
    try {
      const paymentResponse = await FanjoyAPI.Payments.createPreference(order._id);
      
      if (!paymentResponse.success) {
        throw new Error(paymentResponse.message || 'Erro ao criar pagamento');
      }

      // Limpar carrinho ANTES de redirecionar
      cart = [];
      saveCart();

      // Mensagem de carregamento
      alert('Redirecionando para o pagamento...');

      // Redirecionar para checkout do Mercado Pago
      console.log('Redirecionando para:', paymentResponse.data.init_point);
      window.location.href = paymentResponse.data.init_point;

    } catch (paymentError) {
      console.error('Erro ao criar pagamento:', paymentError);
      
      // Se Mercado Pago não estiver configurado, mostrar mensagem clara
      alert(
        '⚠️ ERRO NO PAGAMENTO\n\n' +
        'O sistema de pagamento não está configurado.\n\n' +
        'Seu pedido foi criado (Pedido #' + (order.orderNumber || order._id) + ') mas aguarda configuração do pagamento.\n\n' +
        'Entre em contato com o suporte para finalizar o pagamento.'
      );
      
      // Limpar carrinho mesmo assim
      cart = [];
      saveCart();
      
      // Ir para perfil ver o pedido
      window.location.href = 'customer-profile.html';
    }

  } catch (error) {
    console.error('Erro no checkout:', error);
    alert('Erro ao finalizar compra: ' + error.message + '\n\nTente novamente ou entre em contato com o suporte.');
  }
}

// ========================================
// Verificar Redirecionamento de Login
// ========================================

function checkCheckoutRedirect() {
  if (sessionStorage.getItem('fanjoy_checkout_redirect') === 'true') {
    sessionStorage.removeItem('fanjoy_checkout_redirect');
    if (cart.length > 0) {
      setTimeout(() => {
        if (confirm('Deseja finalizar sua compra agora?')) {
          checkout();
        }
      }, 500);
    }
  }
}
