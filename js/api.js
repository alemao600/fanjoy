// ========================================
// Configuração da API Backend
// ========================================

const API_CONFIG = {
  // URL da API (ajuste conforme seu ambiente)
  baseURL: 'http://localhost:5000/api',
  // Produção: baseURL: 'https://sua-api.railway.app/api',
  
  timeout: 10000
};

// Chave pública do Mercado Pago
const MERCADOPAGO_PUBLIC_KEY = 'APP_USR-0d2705f9-ecee-40bf-a784-afcbae749106';

// ========================================
// Funções de Autenticação
// ========================================

function getAuthToken() {
  return localStorage.getItem('fanjoy_token');
}

function setAuthToken(token) {
  localStorage.setItem('fanjoy_token', token);
}

function clearAuthToken() {
  localStorage.removeItem('fanjoy_token');
  sessionStorage.clear();
}

function isAuthenticated() {
  return !!getAuthToken();
}

// ========================================
// Funções de API
// ========================================

async function apiRequest(endpoint, options = {}) {
  try {
    const token = getAuthToken();
    
    const config = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
      },
      ...(options.body && { body: JSON.stringify(options.body) })
    };

    const response = await fetch(`${API_CONFIG.baseURL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      // Se token inválido, fazer logout
      if (response.status === 401) {
        clearAuthToken();
        window.location.href = 'customer-login.html';
      }
      throw new Error(data.message || 'Erro na requisição');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// ========================================
// API de Autenticação
// ========================================

const AuthAPI = {
  async register(userData) {
    return await apiRequest('/auth/register', {
      method: 'POST',
      body: userData
    });
  },

  async login(credentials) {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: credentials
    });
    
    if (response.success && response.data.token) {
      setAuthToken(response.data.token);
    }
    
    return response;
  },

  async adminLogin(credentials) {
    const response = await apiRequest('/auth/admin/login', {
      method: 'POST',
      body: credentials
    });
    
    if (response.success && response.data.token) {
      setAuthToken(response.data.token);
    }
    
    return response;
  },

  logout() {
    clearAuthToken();
    window.location.href = 'index.html';
  }
};

// ========================================
// API de Produtos
// ========================================

const ProductsAPI = {
  async getAll(filters = {}) {
    const params = new URLSearchParams(filters);
    return await apiRequest(`/products?${params}`);
  },

  async getById(id) {
    return await apiRequest(`/products/${id}`);
  },

  async create(productData) {
    return await apiRequest('/admin/products', {
      method: 'POST',
      body: productData
    });
  },

  async update(id, productData) {
    return await apiRequest(`/admin/products/${id}`, {
      method: 'PUT',
      body: productData
    });
  },

  async delete(id) {
    return await apiRequest(`/admin/products/${id}`, {
      method: 'DELETE'
    });
  }
};

// ========================================
// API de Pedidos
// ========================================

const OrdersAPI = {
  async create(orderData) {
    return await apiRequest('/orders', {
      method: 'POST',
      body: orderData
    });
  },

  async getMyOrders() {
    return await apiRequest('/orders');
  },

  async getById(id) {
    return await apiRequest(`/orders/${id}`);
  },

  async getAllAdmin(filters = {}) {
    const params = new URLSearchParams(filters);
    return await apiRequest(`/admin/orders?${params}`);
  },

  async updateStatus(id, status, trackingCode) {
    return await apiRequest(`/admin/orders/${id}/status`, {
      method: 'PUT',
      body: { status, trackingCode }
    });
  }
};

// ========================================
// API de Clientes
// ========================================

const CustomersAPI = {
  async getProfile() {
    return await apiRequest('/customers/profile');
  },

  async updateProfile(profileData) {
    return await apiRequest('/customers/profile', {
      method: 'PUT',
      body: profileData
    });
  },

  async addAddress(addressData) {
    return await apiRequest('/customers/addresses', {
      method: 'POST',
      body: addressData
    });
  },

  async updateAddress(addressId, addressData) {
    return await apiRequest(`/customers/addresses/${addressId}`, {
      method: 'PUT',
      body: addressData
    });
  },

  async deleteAddress(addressId) {
    return await apiRequest(`/customers/addresses/${addressId}`, {
      method: 'DELETE'
    });
  }
};

// ========================================
// API de Pagamentos
// ========================================

const PaymentsAPI = {
  async createPreference(orderId) {
    return await apiRequest('/payments/create-preference', {
      method: 'POST',
      body: { orderId }
    });
  },

  async getStatus(orderId) {
    return await apiRequest(`/payments/status/${orderId}`);
  }
};

// ========================================
// API de Categorias
// ========================================

const CategoriesAPI = {
  async getAll() {
    return await apiRequest('/categories');
  },

  async create(categoryData) {
    return await apiRequest('/admin/categories', {
      method: 'POST',
      body: categoryData
    });
  }
};

// ========================================
// API Admin Dashboard
// ========================================

const AdminAPI = {
  async getDashboard() {
    return await apiRequest('/admin/dashboard');
  }
};

// ========================================
// Utilidades
// ========================================

// Formatar moeda
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// Formatar data
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

// Validar CPF
function validateCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  
  // Validação simplificada
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit > 9) digit = 0;
  if (digit !== parseInt(cpf.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit > 9) digit = 0;
  if (digit !== parseInt(cpf.charAt(10))) return false;
  
  return true;
}

// Validar e-mail
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Máscara de telefone
function maskPhone(value) {
  value = value.replace(/\D/g, '');
  if (value.length <= 11) {
    value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
    value = value.replace(/(\d)(\d{4})$/, '$1-$2');
  }
  return value;
}

// Máscara de CEP
function maskCEP(value) {
  value = value.replace(/\D/g, '');
  if (value.length <= 8) {
    value = value.replace(/^(\d{5})(\d)/, '$1-$2');
  }
  return value;
}

// Máscara de CPF
function maskCPF(value) {
  value = value.replace(/\D/g, '');
  if (value.length <= 11) {
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return value;
}

// ========================================
// Inicialização do Mercado Pago
// ========================================

let mercadoPagoInstance = null;

function initMercadoPago() {
  if (typeof MercadoPago !== 'undefined' && MERCADOPAGO_PUBLIC_KEY !== 'SUA_PUBLIC_KEY_AQUI') {
    mercadoPagoInstance = new MercadoPago(MERCADOPAGO_PUBLIC_KEY);
    console.log('✅ Mercado Pago inicializado');
  } else {
    console.warn('⚠️ Mercado Pago não inicializado. Configure a PUBLIC_KEY');
  }
}

// Auto-inicializar se o script do MP estiver carregado
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMercadoPago);
} else {
  initMercadoPago();
}

// ========================================
// Exportar para uso global
// ========================================

window.FanjoyAPI = {
  Auth: AuthAPI,
  Products: ProductsAPI,
  Orders: OrdersAPI,
  Customers: CustomersAPI,
  Payments: PaymentsAPI,
  Categories: CategoriesAPI,
  Admin: AdminAPI,
  Utils: {
    formatCurrency,
    formatDate,
    validateCPF,
    validateEmail,
    maskPhone,
    maskCEP,
    maskCPF
  }
};

console.log('✅ Fanjoy API configurada e pronta para uso');
console.log('📡 API URL:', API_CONFIG.baseURL);
