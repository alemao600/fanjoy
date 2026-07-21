// ========================================
// INDEX.HTML - Integração com API
// ========================================

window.allProducts = [];
window.filteredProducts = [];

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeImageSrc(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('data:image/')) return raw;
  try {
    const parsed = new URL(raw, window.location.origin);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.origin === window.location.origin) return parsed.href;
  } catch {
    if (/^(assets\/|\/assets\/|logo\.|\/logo\.)/i.test(raw)) return raw;
  }
  return '';
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();
  await loadCategories();
  updateAuthUI();
  updateCartCounter();
});

function updateAuthUI() {
  const authSection = document.querySelector('.auth-section');
  if (!authSection) return;

  if (window.FanjoyAPI.Auth.isAuthenticated && window.FanjoyAPI.Auth.isAuthenticated()) {
    const customerName = sessionStorage.getItem('fanjoy_customer_name') || 'Cliente';
    authSection.innerHTML = `
      <span style="margin-right: 12px;">Olá, ${escapeHtml(customerName)}!</span>
      <a href="customer-profile.html" class="btn-profile">Minha Conta</a>
      <button onclick="logout()" class="btn-logout">Sair</button>
    `;
  } else {
    authSection.innerHTML = '<a href="customer-login.html" class="btn-login">Login</a>';
  }
}

function logout() {
  FanjoyAPI.Auth.logout();
}

async function loadProducts() {
  try {
    const response = await FanjoyAPI.Products.getAll();
    window.allProducts = response.success ? (response.data.products || []) : getDefaultProducts();
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
    window.allProducts = getDefaultProducts();
  }
  window.filteredProducts = [...window.allProducts];
  renderProducts();
}

async function loadCategories() {
  try {
    const response = await FanjoyAPI.Categories.getAll();
    if (response.success) renderCategoryFilters(response.data || []);
  } catch (error) {
    console.error('Erro ao carregar categorias:', error);
  }
}

function renderCategoryFilters(categories) {
  const filterCategories = document.getElementById('filterCategories');
  if (!filterCategories) return;
  filterCategories.innerHTML = `
    <label><input type="checkbox" value="all" checked onchange="applyFilters()"> Todos</label>
  `;
  categories.forEach((cat) => {
    const value = String(cat.slug || cat.name || '').toLowerCase();
    filterCategories.insertAdjacentHTML('beforeend', `
      <label>
        <input type="checkbox" value="${escapeHtml(value)}" onchange="applyFilters()">
        ${escapeHtml(cat.name)}
      </label>
    `);
  });
}

function renderProducts() {
  const productsGrid = document.getElementById('productsGrid');
  if (!productsGrid) return;

  if (!window.filteredProducts.length) {
    productsGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--muted);">
        <h3>Nenhum produto encontrado</h3>
        <p style="margin-top: 8px;">Tente ajustar os filtros</p>
      </div>
    `;
    return;
  }

  productsGrid.innerHTML = window.filteredProducts.map((product) => {
    const productId = String(product._id || product.id || '');
    const image = safeImageSrc(product.images && product.images[0] ? product.images[0] : 'https://via.placeholder.com/400');
    return `
      <div class="product-card" data-product-id="${escapeHtml(productId)}">
        <div class="product-image">
          <img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}">
          ${product.tag ? `<span class="product-tag">${escapeHtml(product.tag)}</span>` : ''}
        </div>
        <div class="product-info">
          <h3 class="product-title">${escapeHtml(product.name)}</h3>
          <p class="product-description">${escapeHtml(product.description || '')}</p>
          <div class="product-footer">
            <span class="product-price">R$ ${Number(product.price || 0).toFixed(2)}</span>
            <button class="btn-add-cart" onclick='addToCart(${JSON.stringify(productId)}, event)'>${escapeHtml(product.buttonText || 'Comprar')}</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function addToCart(productId, event) {
  const product = window.allProducts.find((p) => String(p._id || p.id) === String(productId));
  if (!product) {
    alert('Produto não encontrado');
    return;
  }

  const cart = JSON.parse(localStorage.getItem('fanjoy_cart') || '[]');
  const existingItem = cart.find((item) => String(item.id) === String(productId));
  if (existingItem) existingItem.quantity += 1;
  else {
    cart.push({
      id: productId,
      name: product.name,
      price: Number(product.price || 0),
      image: product.images && product.images[0] ? product.images[0] : '',
      quantity: 1
    });
  }

  localStorage.setItem('fanjoy_cart', JSON.stringify(cart));
  updateCartCounter();

  const btn = event?.target;
  if (!btn) return;
  const originalText = btn.textContent;
  btn.textContent = 'Adicionado';
  btn.style.background = '#10b981';
  setTimeout(() => {
    btn.textContent = originalText;
    btn.style.background = '';
  }, 1500);
}

function updateCartCounter() {
  const counter = document.getElementById('cartCounter');
  if (!counter) return;
  const cart = JSON.parse(localStorage.getItem('fanjoy_cart') || '[]');
  const totalItems = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  counter.textContent = String(totalItems);
  counter.style.display = totalItems > 0 ? 'flex' : 'none';
}

function applyFilters() {
  const searchInput = document.getElementById('searchInput');
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
  const selectedCategories = Array.from(document.querySelectorAll('#filterCategories input[type="checkbox"]'))
    .filter((cb) => cb.checked && cb.value !== 'all')
    .map((cb) => cb.value);
  const minPrice = parseFloat(document.getElementById('minPrice')?.value || 0);
  const maxPrice = parseFloat(document.getElementById('maxPrice')?.value || 10000);

  window.filteredProducts = window.allProducts.filter((product) => {
    const matchesSearch = !searchTerm ||
      String(product.name || '').toLowerCase().includes(searchTerm) ||
      String(product.description || '').toLowerCase().includes(searchTerm);
    const matchesCategory = !selectedCategories.length ||
      (product.categories && product.categories.some((cat) => selectedCategories.includes(cat.slug || String(cat.name || '').toLowerCase())));
    const matchesPrice = Number(product.price || 0) >= minPrice && Number(product.price || 0) <= maxPrice;
    return matchesSearch && matchesCategory && matchesPrice;
  });

  renderProducts();
}

function getDefaultProducts() {
  return [];
}

document.getElementById('searchInput')?.addEventListener('input', applyFilters);
document.getElementById('minPrice')?.addEventListener('input', applyFilters);
document.getElementById('maxPrice')?.addEventListener('input', applyFilters);
