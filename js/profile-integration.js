// ========================================
// CUSTOMER-PROFILE.HTML - Integração com API
// ========================================

let currentCustomer = null;
let editingAddressId = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Verificar se está logado
  if (!FanjoyAPI.Auth.isAuthenticated || !FanjoyAPI.Auth.isAuthenticated()) {
    window.location.href = 'customer-login.html';
    return;
  }

  await loadCustomerData();
  setupEventListeners();
});

// ========================================
// Carregar Dados do Cliente
// ========================================

async function loadCustomerData() {
  try {
    const response = await FanjoyAPI.Customers.getProfile();
    
    if (!response.success) {
      throw new Error(response.message || 'Erro ao carregar perfil');
    }

    currentCustomer = response.data;
    renderPersonalData();
    renderAddresses();
    await loadOrders();

  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    alert('Erro ao carregar perfil: ' + error.message);
    FanjoyAPI.Auth.logout();
  }
}

// ========================================
// Renderizar Dados Pessoais
// ========================================

function renderPersonalData() {
  if (!currentCustomer) return;

  document.getElementById('profileName').value = currentCustomer.name || '';
  document.getElementById('profileLastName').value = currentCustomer.lastName || '';
  document.getElementById('profileEmail').value = currentCustomer.email || '';
  document.getElementById('profilePhone').value = currentCustomer.phone || '';
  document.getElementById('profileCPF').value = currentCustomer.cpf || '';
}

// ========================================
// Salvar Dados Pessoais
// ========================================

async function savePersonalData() {
  const name = document.getElementById('profileName').value.trim();
  const lastName = document.getElementById('profileLastName').value.trim();
  const email = document.getElementById('profileEmail').value.trim();
  const phone = document.getElementById('profilePhone').value.trim();
  const cpf = document.getElementById('profileCPF').value.trim();

  if (!name || !lastName || !email || !phone) {
    alert('Por favor, preencha todos os campos obrigatórios');
    return;
  }

  if (!FanjoyAPI.Utils.validateEmail(email)) {
    alert('E-mail inválido');
    return;
  }

  if (cpf && !FanjoyAPI.Utils.validateCPF(cpf)) {
    alert('CPF inválido');
    return;
  }

  try {
    const response = await FanjoyAPI.Customers.updateProfile({
      name,
      lastName,
      email,
      phone,
      cpf
    });

    if (response.success) {
      currentCustomer = response.data;
      sessionStorage.setItem('fanjoy_customer_name', name);
      showSuccessMessage();
    } else {
      alert('Erro ao salvar: ' + response.message);
    }
  } catch (error) {
    console.error('Erro ao salvar:', error);
    alert('Erro ao salvar dados: ' + error.message);
  }
}

// ========================================
// Renderizar Endereços
// ========================================

function renderAddresses() {
  const addressList = document.getElementById('addressList');
  if (!addressList) return;

  if (!currentCustomer.addresses || currentCustomer.addresses.length === 0) {
    addressList.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #6b7280;">
        <p>Nenhum endereço cadastrado</p>
        <button onclick="openAddressModal()" style="margin-top: 16px; padding: 12px 24px; background: linear-gradient(135deg, #ff6bce, #7c3aed); color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 600;">
          Adicionar Endereço
        </button>
      </div>
    `;
    return;
  }

  addressList.innerHTML = currentCustomer.addresses.map(addr => `
    <div class="address-card ${addr.isDefault ? 'default' : ''}">
      <div class="address-header">
        <strong>${addr.label || 'Endereço'}</strong>
        ${addr.isDefault ? '<span class="badge-default">Padrão</span>' : ''}
      </div>
      <p>${addr.street}, ${addr.number}${addr.complement ? ' - ' + addr.complement : ''}</p>
      <p>${addr.neighborhood} - ${addr.city}/${addr.state}</p>
      <p>CEP: ${addr.cep}</p>
      <div class="address-actions">
        <button onclick="editAddress('${addr._id}')" class="btn-edit">✏️ Editar</button>
        <button onclick="deleteAddress('${addr._id}')" class="btn-delete">🗑️ Excluir</button>
        ${!addr.isDefault ? `<button onclick="setDefaultAddress('${addr._id}')" class="btn-default">⭐ Tornar Padrão</button>` : ''}
      </div>
    </div>
  `).join('');
}

// ========================================
// Modal de Endereço
// ========================================

function openAddressModal(addressId = null) {
  editingAddressId = addressId;
  const modal = document.getElementById('addressModal');
  const modalTitle = document.getElementById('modalTitle');
  
  if (addressId) {
    const address = currentCustomer.addresses.find(a => a._id === addressId);
    if (address) {
      modalTitle.textContent = 'Editar Endereço';
      document.getElementById('addressLabel').value = address.label || '';
      document.getElementById('addressCEP').value = address.cep || '';
      document.getElementById('addressStreet').value = address.street || '';
      document.getElementById('addressNumber').value = address.number || '';
      document.getElementById('addressComplement').value = address.complement || '';
      document.getElementById('addressNeighborhood').value = address.neighborhood || '';
      document.getElementById('addressCity').value = address.city || '';
      document.getElementById('addressState').value = address.state || '';
      document.getElementById('addressDefault').checked = address.isDefault || false;
    }
  } else {
    modalTitle.textContent = 'Novo Endereço';
    document.getElementById('addressForm').reset();
  }

  modal.style.display = 'flex';
}

function closeAddressModal() {
  document.getElementById('addressModal').style.display = 'none';
  document.getElementById('addressForm').reset();
  editingAddressId = null;
}

// ========================================
// Salvar Endereço
// ========================================

async function saveAddress() {
  const addressData = {
    label: document.getElementById('addressLabel').value.trim(),
    cep: document.getElementById('addressCEP').value.trim(),
    street: document.getElementById('addressStreet').value.trim(),
    number: document.getElementById('addressNumber').value.trim(),
    complement: document.getElementById('addressComplement').value.trim(),
    neighborhood: document.getElementById('addressNeighborhood').value.trim(),
    city: document.getElementById('addressCity').value.trim(),
    state: document.getElementById('addressState').value.trim(),
    isDefault: document.getElementById('addressDefault').checked
  };

  if (!addressData.cep || !addressData.street || !addressData.number || 
      !addressData.neighborhood || !addressData.city || !addressData.state) {
    alert('Por favor, preencha todos os campos obrigatórios');
    return;
  }

  try {
    let response;
    
    if (editingAddressId) {
      // Atualizar endereço existente
      response = await FanjoyAPI.Customers.updateAddress(editingAddressId, addressData);
    } else {
      // Criar novo endereço
      response = await FanjoyAPI.Customers.addAddress(addressData);
    }

    if (response.success) {
      currentCustomer = response.data;
      renderAddresses();
      closeAddressModal();
      showSuccessMessage();
    } else {
      alert('Erro ao salvar endereço: ' + response.message);
    }
  } catch (error) {
    console.error('Erro ao salvar endereço:', error);
    alert('Erro ao salvar endereço: ' + error.message);
  }
}

// ========================================
// Editar Endereço
// ========================================

function editAddress(addressId) {
  openAddressModal(addressId);
}

// ========================================
// Excluir Endereço
// ========================================

async function deleteAddress(addressId) {
  if (!confirm('Deseja realmente excluir este endereço?')) {
    return;
  }

  try {
    const response = await FanjoyAPI.Customers.deleteAddress(addressId);
    
    if (response.success) {
      currentCustomer = response.data;
      renderAddresses();
      showSuccessMessage();
    } else {
      alert('Erro ao excluir endereço: ' + response.message);
    }
  } catch (error) {
    console.error('Erro ao excluir endereço:', error);
    alert('Erro ao excluir endereço: ' + error.message);
  }
}

// ========================================
// Definir Endereço Padrão
// ========================================

async function setDefaultAddress(addressId) {
  const address = currentCustomer.addresses.find(a => a._id === addressId);
  if (!address) return;

  try {
    const response = await FanjoyAPI.Customers.updateAddress(addressId, {
      ...address,
      isDefault: true
    });

    if (response.success) {
      currentCustomer = response.data;
      renderAddresses();
      showSuccessMessage();
    } else {
      alert('Erro ao definir endereço padrão: ' + response.message);
    }
  } catch (error) {
    console.error('Erro:', error);
    alert('Erro ao definir endereço padrão: ' + error.message);
  }
}

// ========================================
// Carregar Pedidos
// ========================================

async function loadOrders() {
  try {
    const response = await FanjoyAPI.Orders.getMyOrders();
    
    if (response.success) {
      renderOrders(response.data.orders || []);
    } else {
      renderOrders([]);
    }
  } catch (error) {
    console.error('Erro ao carregar pedidos:', error);
    renderOrders([]);
  }
}

function renderOrders(orders) {
  const ordersList = document.getElementById('ordersList');
  if (!ordersList) return;

  if (orders.length === 0) {
    ordersList.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #6b7280;">
        <p>Nenhum pedido realizado ainda</p>
        <a href="index.html" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: linear-gradient(135deg, #ff6bce, #7c3aed); color: white; text-decoration: none; border-radius: 12px; font-weight: 600;">
          Ver Produtos
        </a>
      </div>
    `;
    return;
  }

  ordersList.innerHTML = orders.map(order => {
    const statusColors = {
      pending: '#f59e0b',
      processing: '#3b82f6',
      shipped: '#8b5cf6',
      delivered: '#10b981',
      cancelled: '#ef4444'
    };

    const statusLabels = {
      pending: 'Pendente',
      processing: 'Processando',
      shipped: 'Enviado',
      delivered: 'Entregue',
      cancelled: 'Cancelado'
    };

    return `
      <div class="order-card">
        <div class="order-header">
          <div>
            <strong>Pedido #${order.orderNumber || order._id.slice(-6)}</strong>
            <span style="display: block; font-size: 14px; color: #6b7280; margin-top: 4px;">
              ${FanjoyAPI.Utils.formatDate(order.createdAt)}
            </span>
          </div>
          <span class="order-status" style="background: ${statusColors[order.status] || '#6b7280'};">
            ${statusLabels[order.status] || order.status}
          </span>
        </div>
        <div class="order-items">
          ${order.items.map(item => `
            <div style="display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
              <span style="flex: 1;">${item.product?.name || 'Produto'} x${item.quantity}</span>
              <span style="font-weight: 600;">${FanjoyAPI.Utils.formatCurrency(item.price)}</span>
            </div>
          `).join('')}
        </div>
        <div class="order-footer">
          <div>
            ${order.trackingCode ? `<span style="font-size: 14px; color: #6b7280;">Rastreio: ${order.trackingCode}</span>` : ''}
          </div>
          <div style="text-align: right;">
            <span style="display: block; font-size: 14px; color: #6b7280;">Total:</span>
            <strong style="font-size: 18px; color: #ff6bce;">${FanjoyAPI.Utils.formatCurrency(order.total)}</strong>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ========================================
// Event Listeners
// ========================================

function setupEventListeners() {
  // Máscaras
  document.getElementById('profilePhone')?.addEventListener('input', (e) => {
    e.target.value = FanjoyAPI.Utils.maskPhone(e.target.value);
  });

  document.getElementById('profileCPF')?.addEventListener('input', (e) => {
    e.target.value = FanjoyAPI.Utils.maskCPF(e.target.value);
  });

  document.getElementById('addressCEP')?.addEventListener('input', (e) => {
    e.target.value = FanjoyAPI.Utils.maskCEP(e.target.value);
  });

  // Fechar modal ao clicar fora
  document.getElementById('addressModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'addressModal') {
      closeAddressModal();
    }
  });
}

// ========================================
// Mensagem de Sucesso
// ========================================

function showSuccessMessage() {
  const msg = document.getElementById('successMessage');
  if (msg) {
    msg.classList.add('show');
    setTimeout(() => {
      msg.classList.remove('show');
    }, 3000);
  }
}

// ========================================
// Logout
// ========================================

function logout() {
  FanjoyAPI.Auth.logout();
}
