// ========================================
// CUSTOMER-LOGIN.HTML - Integracao com API
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  updateLoginCartCount();

  if (FanjoyAPI.Auth.isAuthenticated && FanjoyAPI.Auth.isAuthenticated()) {
    window.location.href = getPostLoginRedirectUrl();
    return;
  }

  setupForms();
});

function setupForms() {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  const registerForm = document.getElementById('registerForm');
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
}

function getPostLoginRedirectUrl() {
  const params = new URLSearchParams(window.location.search);
  const nextQuery = params.get('next');
  const nextSession = sessionStorage.getItem('fanjoy_after_login_redirect');
  const isCheckoutRedirect = sessionStorage.getItem('fanjoy_checkout_redirect') === 'true';
  const next = nextQuery || nextSession;
  if (next) return next;
  if (isCheckoutRedirect) return 'cart.html';
  return 'customer-profile.html';
}

function updateLoginCartCount() {
  const badge = document.getElementById('loginCartCount');
  if (!badge) return;
  try {
    const cart = JSON.parse(localStorage.getItem('fanjoy_cart') || '[]');
    const count = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    badge.textContent = String(count);
    badge.hidden = count <= 0;
  } catch {
    badge.textContent = '0';
    badge.hidden = true;
  }
}

async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    showMessage('loginError', 'Por favor, preencha todos os campos');
    return;
  }

  try {
    let response = await FanjoyAPI.Auth.login({ email, password });

    if (!response.success && /invalid login credentials/i.test(String(response.message || ''))) {
      const migrated = await tryAutoMigrateLegacyAccount(email, password);
      if (migrated) response = await FanjoyAPI.Auth.login({ email, password });
    }

    if (response.success) {
      const customer = response.data.customer;
      sessionStorage.setItem('fanjoy_customer_logged', 'true');
      sessionStorage.setItem('fanjoy_customer_id', customer._id);
      sessionStorage.setItem('fanjoy_customer_name', customer.name);

      showMessage('loginSuccess', 'Login realizado com sucesso!');

      setTimeout(() => {
        const redirectUrl = getPostLoginRedirectUrl();
        sessionStorage.removeItem('fanjoy_after_login_redirect');
        sessionStorage.removeItem('fanjoy_checkout_redirect');
        window.location.href = redirectUrl;
      }, 600);
    } else {
      showMessage('loginError', response.message || 'Erro ao fazer login');
    }
  } catch (error) {
    console.error('Erro no login:', error);
    showMessage('loginError', error.message || 'Erro ao fazer login. Tente novamente.');
  }
}

async function tryAutoMigrateLegacyAccount(email, password) {
  try {
    const legacy = JSON.parse(localStorage.getItem('fanjoy_customers') || '[]');
    const match = legacy.find((c) => String(c.email || '').toLowerCase() === String(email || '').toLowerCase());

    const guessedName = match?.name || String(email || '').split('@')[0] || 'Cliente';
    const guessedLastName = match?.lastName || '';
    const guessedPhone = match?.phone || '';

    const reg = await FanjoyAPI.Auth.register({
      name: guessedName,
      lastName: guessedLastName,
      email,
      phone: guessedPhone,
      password
    });

    if (reg.success) return true;
    return /already registered|already exists|email/i.test(String(reg.message || ''));
  } catch {
    return false;
  }
}

async function handleRegister(e) {
  e.preventDefault();

  const name = document.getElementById('registerName').value.trim();
  const lastName = document.getElementById('registerLastName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const phone = document.getElementById('registerPhone').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('registerConfirmPassword').value;

  if (!name || !lastName || !email || !phone || !password || !confirmPassword) {
    showMessage('registerError', 'Por favor, preencha todos os campos');
    return;
  }

  if (!FanjoyAPI.Utils.validateEmail(email)) {
    showMessage('registerError', 'E-mail invalido');
    return;
  }

  if (password.length < 6) {
    showMessage('registerError', 'A senha deve ter no minimo 6 caracteres');
    return;
  }

  if (password !== confirmPassword) {
    showMessage('registerError', 'As senhas nao coincidem');
    return;
  }

  try {
    const response = await FanjoyAPI.Auth.register({ name, lastName, email, phone, password });

    if (response.success) {
      showMessage('registerSuccess', 'Conta criada com sucesso! Entrando automaticamente...');
      document.getElementById('registerForm').reset();

      const loginResponse = await FanjoyAPI.Auth.login({ email, password });
      if (loginResponse.success) {
        const customer = loginResponse.data.customer;
        sessionStorage.setItem('fanjoy_customer_logged', 'true');
        sessionStorage.setItem('fanjoy_customer_id', customer._id);
        sessionStorage.setItem('fanjoy_customer_name', customer.name);

        setTimeout(() => {
          const redirectUrl = getPostLoginRedirectUrl();
          sessionStorage.removeItem('fanjoy_after_login_redirect');
          sessionStorage.removeItem('fanjoy_checkout_redirect');
          window.location.href = redirectUrl;
        }, 700);
        return;
      }

      showMessage('registerSuccess', 'Conta criada. Faça login para continuar.');
      setTimeout(() => {
        document.querySelector('.tab-btn:first-child')?.click();
        document.getElementById('loginEmail').value = email;
      }, 1200);
    } else {
      if (/already|exists|cadastrado|registered|email/i.test(String(response.message || ''))) {
        showMessage('registerError', 'E-mail ja cadastrado. Use a aba Entrar para fazer login.');
      } else {
        showMessage('registerError', response.message || 'Erro ao criar conta');
      }
    }
  } catch (error) {
    console.error('Erro no registro:', error);
    showMessage('registerError', error.message || 'Erro ao criar conta. Tente novamente.');
  }
}

function showMessage(elementId, message) {
  const messageElement = document.getElementById(elementId);
  if (!messageElement) return;

  messageElement.textContent = message;
  messageElement.classList.add('show');

  setTimeout(() => {
    messageElement.classList.remove('show');
  }, 5000);
}

document.getElementById('registerPhone')?.addEventListener('input', (e) => {
  e.target.value = FanjoyAPI.Utils.maskPhone(e.target.value);
});
