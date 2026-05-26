// ========================================
// CUSTOMER-LOGIN.HTML - Integração com API
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  // Verificar se já está logado
  if (FanjoyAPI.Auth.isAuthenticated && FanjoyAPI.Auth.isAuthenticated()) {
    window.location.href = 'customer-profile.html';
  }

  setupForms();
});

// ========================================
// Configurar Formulários
// ========================================

function setupForms() {
  // Formulário de Login
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Formulário de Registro
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
}

// ========================================
// Login (Integração com API)
// ========================================

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

    // Legacy migration fallback:
    // If old local account existed before Supabase migration, try creating
    // a Supabase account automatically and login again.
    if (!response.success && /invalid login credentials/i.test(String(response.message || ""))) {
      const migrated = await tryAutoMigrateLegacyAccount(email, password);
      if (migrated) {
        response = await FanjoyAPI.Auth.login({ email, password });
      }
    }

    if (response.success) {
      const customer = response.data.customer;
      
      // Salvar dados do cliente
      sessionStorage.setItem('fanjoy_customer_logged', 'true');
      sessionStorage.setItem('fanjoy_customer_id', customer._id);
      sessionStorage.setItem('fanjoy_customer_name', customer.name);

      showMessage('loginSuccess', 'Login realizado com sucesso!');

      // Redirecionar
      setTimeout(() => {
        // Verificar se veio do checkout
        const isCheckoutRedirect = sessionStorage.getItem('fanjoy_checkout_redirect') === 'true';
        
        if (isCheckoutRedirect) {
          // Voltar para o carrinho
          window.location.href = 'cart.html';
        } else {
          // Ir para o perfil
          window.location.href = 'customer-profile.html';
        }
      }, 1000);
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
    const legacy = JSON.parse(localStorage.getItem("fanjoy_customers") || "[]");
    const match = legacy.find((c) => String(c.email || "").toLowerCase() === String(email || "").toLowerCase());

    const guessedName = match?.name || String(email || "").split("@")[0] || "Cliente";
    const guessedLastName = match?.lastName || "";
    const guessedPhone = match?.phone || "";

    const reg = await FanjoyAPI.Auth.register({
      name: guessedName,
      lastName: guessedLastName,
      email,
      phone: guessedPhone,
      password
    });

    // success OR user already exists (but with stale session) should allow retry login
    if (reg.success) return true;

    // Some Supabase projects return generic messages; allow a retry path
    // when account might already exist.
    if (/already registered|already exists|email/i.test(String(reg.message || ""))) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ========================================
// Registro (Integração com API)
// ========================================

async function handleRegister(e) {
  e.preventDefault();

  const name = document.getElementById('registerName').value.trim();
  const lastName = document.getElementById('registerLastName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const phone = document.getElementById('registerPhone').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('registerConfirmPassword').value;

  // Validações
  if (!name || !lastName || !email || !phone || !password || !confirmPassword) {
    showMessage('registerError', 'Por favor, preencha todos os campos');
    return;
  }

  if (!FanjoyAPI.Utils.validateEmail(email)) {
    showMessage('registerError', 'E-mail inválido');
    return;
  }

  if (password.length < 6) {
    showMessage('registerError', 'A senha deve ter no mínimo 6 caracteres');
    return;
  }

  if (password !== confirmPassword) {
    showMessage('registerError', 'As senhas não coincidem');
    return;
  }

  try {
    const userData = {
      name,
      lastName,
      email,
      phone,
      password
    };

    const response = await FanjoyAPI.Auth.register(userData);

    if (response.success) {
      showMessage('registerSuccess', 'Conta criada com sucesso! Faça login para continuar.');

      // Resetar formulário
      document.getElementById('registerForm').reset();

      // Trocar para aba de login após 2 segundos
      setTimeout(() => {
        document.querySelector('.tab-btn:first-child').click();
        document.getElementById('loginEmail').value = email;
      }, 2000);
    } else {
      if (/already|exists|cadastrado|registered|email/i.test(String(response.message || ""))) {
        showMessage('registerError', 'E-mail já cadastrado. Use a aba Entrar para fazer login.');
      } else {
        showMessage('registerError', response.message || 'Erro ao criar conta');
      }
    }
  } catch (error) {
    console.error('Erro no registro:', error);
    showMessage('registerError', error.message || 'Erro ao criar conta. Tente novamente.');
  }
}

// ========================================
// Mensagens
// ========================================

function showMessage(elementId, message) {
  const messageElement = document.getElementById(elementId);
  if (!messageElement) return;

  messageElement.textContent = message;
  messageElement.classList.add('show');

  setTimeout(() => {
    messageElement.classList.remove('show');
  }, 5000);
}

// ========================================
// Máscaras de Telefone
// ========================================

document.getElementById('registerPhone')?.addEventListener('input', (e) => {
  e.target.value = FanjoyAPI.Utils.maskPhone(e.target.value);
});
