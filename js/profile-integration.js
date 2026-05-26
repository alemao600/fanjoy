let currentCustomer = null;
let editingAddressId = null;

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach((btn) => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach((content) => content.classList.remove('active'));

  const targetButton = Array.from(document.querySelectorAll('.tab')).find((btn) => {
    const text = btn.textContent.toLowerCase();
    return (tab === 'profile' && text.includes('dados')) ||
      (tab === 'addresses' && text.includes('endere')) ||
      (tab === 'orders' && text.includes('hist'));
  });
  if (targetButton) targetButton.classList.add('active');

  if (tab === 'profile') document.getElementById('profileTab')?.classList.add('active');
  if (tab === 'addresses') document.getElementById('addressesTab')?.classList.add('active');
  if (tab === 'orders') document.getElementById('ordersTab')?.classList.add('active');
}

function showSuccessMessage(message = 'Informações salvas com sucesso!') {
  const msg = document.getElementById('successMessage');
  if (!msg) return;
  msg.textContent = message;
  msg.classList.add('show');
  setTimeout(() => msg.classList.remove('show'), 2500);
}

function renderPersonalData() {
  if (!currentCustomer) return;
  document.getElementById('customerName').textContent = currentCustomer.name || 'Cliente';
  document.getElementById('profileName').value = currentCustomer.name || '';
  document.getElementById('profileLastName').value = currentCustomer.lastName || '';
  document.getElementById('profileEmail').value = currentCustomer.email || '';
  document.getElementById('profilePhone').value = currentCustomer.phone || '';
}

function renderAddresses() {
  const list = document.getElementById('addressesList');
  if (!list) return;

  const addresses = currentCustomer?.addresses || [];
  if (!addresses.length) {
    list.innerHTML = '<div class="empty-state"><h3>Nenhum endereço cadastrado</h3><p>Adicione um endereço para continuar.</p></div>';
    return;
  }

  list.innerHTML = addresses.map((addr) => `
    <div class="address-card">
      <h3>${addr.label || 'Endereço'}</h3>
      <p><strong>CEP:</strong> ${addr.cep || '-'}</p>
      <p>${addr.street || ''}, ${addr.number || ''}${addr.complement ? ' - ' + addr.complement : ''}</p>
      <p>${addr.neighborhood || ''}, ${addr.city || ''} - ${addr.state || ''}</p>
      <div class="address-actions">
        <button class="btn-small btn-edit" onclick="editAddress('${addr._id || addr.id}')">Editar</button>
        <button class="btn-small btn-delete" onclick="deleteAddress('${addr._id || addr.id}')">Excluir</button>
      </div>
    </div>
  `).join('');
}

function renderOrders(orders) {
  const list = document.getElementById('ordersList');
  if (!list) return;

  if (!orders?.length) {
    list.innerHTML = '<div class="empty-state"><h3>Nenhum pedido realizado</h3><p>Você ainda não fez nenhuma compra.</p></div>';
    return;
  }

  list.innerHTML = orders.map((order) => `
    <div class="order-card">
      <div class="order-header">
        <div>
          <div class="order-id">Pedido #${order.orderNumber || String(order._id || '').slice(-8)}</div>
          <div class="order-date">${FanjoyAPI.Utils.formatDate(order.createdAt)}</div>
        </div>
        <div class="order-status status-${order.status || 'pending'}">${order.status || 'pending'}</div>
      </div>
      <div class="order-items">
        ${(order.items || []).map((item) => `
          <div class="order-item">
            <div class="order-item-info">
              <div class="order-item-name">${item.product?.name || 'Produto'} x${item.quantity}</div>
              <div class="order-item-details">R$ ${Number(item.price || 0).toFixed(2)}</div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="order-total">Total: ${FanjoyAPI.Utils.formatCurrency(order.total || 0)}</div>
    </div>
  `).join('');
}

async function loadCustomerData() {
  const response = await FanjoyAPI.Customers.getProfile();
  if (!response.success) {
    alert('Sessão expirada. Faça login novamente.');
    await FanjoyAPI.Auth.logout();
    return;
  }

  currentCustomer = response.data;
  renderPersonalData();
  renderAddresses();

  const ordersResp = await FanjoyAPI.Orders.getMyOrders();
  renderOrders(ordersResp.success ? (ordersResp.data.orders || []) : []);
}

async function saveProfile(e) {
  e.preventDefault();
  const payload = {
    name: document.getElementById('profileName').value.trim(),
    lastName: document.getElementById('profileLastName').value.trim(),
    email: document.getElementById('profileEmail').value.trim(),
    phone: document.getElementById('profilePhone').value.trim(),
    cpf: currentCustomer?.cpf || null
  };

  const response = await FanjoyAPI.Customers.updateProfile(payload);
  if (!response.success) {
    alert(response.message || 'Erro ao salvar perfil');
    return;
  }

  currentCustomer = response.data;
  renderPersonalData();
  showSuccessMessage('Perfil atualizado com sucesso!');
}

function openAddressModal(addressId = null) {
  editingAddressId = addressId;
  const form = document.getElementById('addressForm');
  form.reset();
  const modal = document.getElementById('addressModal');
  const title = document.getElementById('addressModalTitle');

  if (addressId) {
    const found = (currentCustomer?.addresses || []).find((a) => String(a._id || a.id) === String(addressId));
    if (found) {
      title.textContent = 'Editar Endereço';
      document.getElementById('addressLabel').value = found.label || '';
      document.getElementById('addressCEP').value = found.cep || '';
      document.getElementById('addressStreet').value = found.street || '';
      document.getElementById('addressNumber').value = found.number || '';
      document.getElementById('addressComplement').value = found.complement || '';
      document.getElementById('addressNeighborhood').value = found.neighborhood || '';
      document.getElementById('addressCity').value = found.city || '';
      document.getElementById('addressState').value = found.state || '';
    }
  } else {
    title.textContent = 'Adicionar Endereço';
  }

  modal.classList.add('active');
}

function closeAddressModal() {
  document.getElementById('addressModal').classList.remove('active');
  editingAddressId = null;
}

async function saveAddress(e) {
  e.preventDefault();
  const payload = {
    label: document.getElementById('addressLabel').value.trim(),
    cep: document.getElementById('addressCEP').value.trim(),
    street: document.getElementById('addressStreet').value.trim(),
    number: document.getElementById('addressNumber').value.trim(),
    complement: document.getElementById('addressComplement').value.trim(),
    neighborhood: document.getElementById('addressNeighborhood').value.trim(),
    city: document.getElementById('addressCity').value.trim(),
    state: document.getElementById('addressState').value.trim(),
    isDefault: (currentCustomer?.addresses || []).length === 0
  };

  const response = editingAddressId
    ? await FanjoyAPI.Customers.updateAddress(editingAddressId, payload)
    : await FanjoyAPI.Customers.addAddress(payload);

  if (!response.success) {
    alert(response.message || 'Erro ao salvar endereço');
    return;
  }

  currentCustomer = response.data;
  renderAddresses();
  closeAddressModal();
  showSuccessMessage('Endereço salvo com sucesso!');
}

async function deleteAddress(addressId) {
  if (!confirm('Deseja excluir este endereço?')) return;
  const response = await FanjoyAPI.Customers.deleteAddress(addressId);
  if (!response.success) {
    alert(response.message || 'Erro ao excluir endereço');
    return;
  }
  currentCustomer = response.data;
  renderAddresses();
  showSuccessMessage('Endereço excluído.');
}

function editAddress(addressId) {
  openAddressModal(addressId);
}

async function logout() {
  await FanjoyAPI.Auth.logout();
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!FanjoyAPI.Auth.isAuthenticated || !FanjoyAPI.Auth.isAuthenticated()) {
    window.location.href = 'customer-login.html';
    return;
  }

  document.getElementById('addressCEP')?.addEventListener('input', (e) => {
    e.target.value = FanjoyAPI.Utils.maskCEP(e.target.value);
  });

  document.getElementById('addressModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'addressModal') closeAddressModal();
  });

  await loadCustomerData();
});
