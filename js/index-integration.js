// ========================================
// INDEX.HTML - Integração com API
// ========================================

let allProducts = [];
let filteredProducts = [];

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();
  await loadCategories();
  updateAuthUI();
  updateCartCounter();
});

// ========================================
// Autenticação UI
// ========================================

function updateAuthUI() {
  const authSection = document.querySelector('.auth-section');
  if (!authSection) return;

  if (window.FanjoyAPI.Auth.isAuthenticated && window.FanjoyAPI.Auth.isAuthenticated()) {
    const customerName = sessionStorage.getItem('fanjoy_customer_name');
    authSection.innerHTML = `
      <span style="margin-right: 12px;">Olá, ${customerName || 'Cliente'}!</span>
      <a href="customer-profile.html" class="btn-profile">Minha Conta</a>
      <button onclick="logout()" class="btn-logout">Sair</button>
    `;
  } else {
    authSection.innerHTML = `
      <a href="customer-login.html" class="btn-login">Login</a>
    `;
  }
}

function logout() {
  FanjoyAPI.Auth.logout();
}

// ========================================
// Carregar Produtos da API
// ========================================

async function loadProducts() {
  try {
    const response = await FanjoyAPI.Products.getAll();
    if (response.success) {
      allProducts = response.data.products || [];
      filteredProducts = [...allProducts];
      renderProducts();
    } else {
      console.warn('Nenhum produto encontrado, usando produtos padrão');
      allProducts = getDefaultProducts();
      filteredProducts = [...allProducts];
      renderProducts();
    }
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
    // Fallback para produtos padrão
    allProducts = getDefaultProducts();
    filteredProducts = [...allProducts];
    renderProducts();
  }
}

// ========================================
// Carregar Categorias da API
// ========================================

async function loadCategories() {
  try {
    const response = await FanjoyAPI.Categories.getAll();
    if (response.success) {
      const categories = response.data || [];
      renderCategoryFilters(categories);
    }
  } catch (error) {
    console.error('Erro ao carregar categorias:', error);
  }
}

function renderCategoryFilters(categories) {
  const filterCategories = document.getElementById('filterCategories');
  if (!filterCategories) return;

  filterCategories.innerHTML = `
    <label>
      <input type="checkbox" value="all" checked onchange="applyFilters()"> Todos
    </label>
  `;

  categories.forEach(cat => {
    filterCategories.innerHTML += `
      <label>
        <input type="checkbox" value="${cat.slug || cat.name.toLowerCase()}" onchange="applyFilters()">
        ${cat.name}
      </label>
    `;
  });
}

// ========================================
// Renderizar Produtos
// ========================================

function renderProducts() {
  const productsGrid = document.getElementById('productsGrid');
  if (!productsGrid) return;

  if (filteredProducts.length === 0) {
    productsGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--muted);">
        <h3>Nenhum produto encontrado</h3>
        <p style="margin-top: 8px;">Tente ajustar os filtros</p>
      </div>
    `;
    return;
  }

  productsGrid.innerHTML = filteredProducts.map(product => `
    <div class="product-card" data-product-id="${product._id || product.id}">
      <div class="product-image">
        <img src="${product.images && product.images[0] ? product.images[0] : 'https://via.placeholder.com/400'}" alt="${product.name}">
        ${product.tag ? `<span class="product-tag">${product.tag}</span>` : ''}
      </div>
      <div class="product-info">
        <h3 class="product-title">${product.name}</h3>
        <p class="product-description">${product.description || ''}</p>
        <div class="product-footer">
          <span class="product-price">R$ ${product.price.toFixed(2)}</span>
          <button class="btn-add-cart" onclick="addToCart('${product._id || product.id}')">
            ${product.buttonText || 'Comprar'}
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// ========================================
// Adicionar ao Carrinho
// ========================================

async function addToCart(productId) {
  const product = allProducts.find(p => (p._id || p.id) === productId);
  if (!product) {
    alert('Produto não encontrado');
    return;
  }

  // Carrinho ainda usa localStorage (frontend only)
  let cart = JSON.parse(localStorage.getItem('fanjoy_cart')) || [];
  
  const existingItem = cart.find(item => item.id === productId);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: productId,
      name: product.name,
      price: product.price,
      image: product.images && product.images[0] ? product.images[0] : '',
      quantity: 1
    });
  }
  
  localStorage.setItem('fanjoy_cart', JSON.stringify(cart));
  updateCartCounter();
  
  // Animação de feedback
  const btn = event.target;
  const originalText = btn.textContent;
  btn.textContent = '✓ Adicionado';
  btn.style.background = '#10b981';
  
  setTimeout(() => {
    btn.textContent = originalText;
    btn.style.background = '';
  }, 1500);
}

// ========================================
// Contador do Carrinho
// ========================================

function updateCartCounter() {
  const counter = document.getElementById('cartCounter');
  if (!counter) return;

  const cart = JSON.parse(localStorage.getItem('fanjoy_cart')) || [];
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  counter.textContent = totalItems;
  counter.style.display = totalItems > 0 ? 'flex' : 'none';
}

// ========================================
// Filtros
// ========================================

function applyFilters() {
  const searchInput = document.getElementById('searchInput');
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
  
  // Filtro de categoria
  const categoryCheckboxes = document.querySelectorAll('#filterCategories input[type="checkbox"]');
  const selectedCategories = Array.from(categoryCheckboxes)
    .filter(cb => cb.checked && cb.value !== 'all')
    .map(cb => cb.value);
  
  // Filtro de preço
  const minPrice = parseFloat(document.getElementById('minPrice')?.value || 0);
  const maxPrice = parseFloat(document.getElementById('maxPrice')?.value || 10000);
  
  filteredProducts = allProducts.filter(product => {
    // Filtro de busca
    const matchesSearch = !searchTerm || 
      product.name.toLowerCase().includes(searchTerm) ||
      (product.description && product.description.toLowerCase().includes(searchTerm));
    
    // Filtro de categoria
    const matchesCategory = selectedCategories.length === 0 || 
      (product.categories && product.categories.some(cat => 
        selectedCategories.includes(cat.slug || cat.name?.toLowerCase())
      ));
    
    // Filtro de preço
    const matchesPrice = product.price >= minPrice && product.price <= maxPrice;
    
    return matchesSearch && matchesCategory && matchesPrice;
  });
  
  renderProducts();
}

// ========================================
// Produtos Padrão (Fallback)
// ========================================

function getDefaultProducts() {
  return [
    {
      id: '1',
      name: 'Camiseta Oversize',
      description: 'Algodão premium 280g, print neon high quality',
      price: 149,
      images: ['https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=600&q=80'],
      categories: ['camiseta'],
      tag: 'Novo',
      buttonText: 'Comprar',
      stock: 50
    },
    {
      id: '2',
      name: 'Caneca Holográfica',
      description: 'Acabamento holo, interior colorido + brinde',
      price: 69,
      images: ['https://images.unsplash.com/photo-1523365280197-f21d6cfc1c67?auto=format&fit=crop&w=600&q=80'],
      categories: ['caneca'],
      tag: 'Hot',
      buttonText: 'Comprar',
      stock: 100
    },
    {
      id: '3',
      name: 'Photocard Set',
      description: 'Papel 400g, laminação premium + QR code',
      price: 79,
      images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80'],
      categories: ['photocard'],
      tag: 'Exclusivo',
      buttonText: 'Comprar',
      stock: 200
    },
    {
      id: '4',
      name: 'Moletom Stage',
      description: 'Oversized, patches refletivos, termocrômico',
      price: 249,
      images: ['https://images.unsplash.com/photo-1542293787938-4d273c3608b8?auto=format&fit=crop&w=600&q=80'],
      categories: ['moletom'],
      tag: 'Trending',
      buttonText: 'Comprar',
      stock: 30
    }
  ];
}

// Event listeners para busca e filtros
document.getElementById('searchInput')?.addEventListener('input', applyFilters);
document.getElementById('minPrice')?.addEventListener('input', applyFilters);
document.getElementById('maxPrice')?.addEventListener('input', applyFilters);
