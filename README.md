# Frontend - Fanjoy Lab

Loja online de produtos K-pop e doramas com integração completa ao backend.

## 🚀 Como Usar

### Desenvolvimento Local

1. **Abrir com Live Server:**
   ```bash
   # Se tiver Live Server do VS Code:
   # Clique com direito em index.html > Open with Live Server
   
   # Ou use qualquer servidor local:
   python -m http.server 8000
   # Acesse: http://localhost:8000
   ```

2. **Configurar API:**
   - Edite `js/api.js`
   - Altere `baseURL` para URL do seu backend:
     ```javascript
     const API_CONFIG = {
       baseURL: 'http://localhost:5000/api',  // Local
       // baseURL: 'https://sua-api.railway.app/api',  // Produção
       timeout: 10000
     };
     ```

3. **Configurar Mercado Pago:**
   - Edite `js/api.js`
   - Adicione sua PUBLIC_KEY:
     ```javascript
     const MERCADOPAGO_PUBLIC_KEY = 'APP_USR-sua-public-key';
     ```

4. **Certifique-se que o backend está rodando:**
   ```bash
   cd backend
   npm run dev
   ```

## 📁 Estrutura de Arquivos

```
fanjoy/
├── index.html              # Página principal (loja)
├── cart.html               # Carrinho de compras
├── customer-login.html     # Login/Registro de clientes
├── customer-profile.html   # Perfil do cliente
├── admin.html              # Painel administrativo
├── login.html              # Login do admin
├── js/
│   ├── api.js              # ⭐ Configuração da API
│   ├── index-integration.js    # Integração index.html
│   ├── cart-integration.js     # Integração cart.html
│   ├── login-integration.js    # Integração login
│   └── profile-integration.js  # Integração perfil
├── backend/                # Backend Node.js
├── GUIA-TESTES.md         # 🧪 Guia completo de testes
└── COMO-COLOCAR-ONLINE.md # 🚀 Deploy em produção
```

## 🔌 Integração com Backend

### Arquivo Principal: `js/api.js`

Este arquivo contém:
- ✅ Configuração da URL da API
- ✅ Funções de autenticação (login, registro, logout)
- ✅ Funções para produtos, pedidos, clientes
- ✅ Integração com Mercado Pago
- ✅ Utilitários (máscaras, validações, formatação)

### APIs Disponíveis:

```javascript
// Autenticação
FanjoyAPI.Auth.register(userData)
FanjoyAPI.Auth.login(credentials)
FanjoyAPI.Auth.logout()

// Produtos
FanjoyAPI.Products.getAll(filters)
FanjoyAPI.Products.getById(id)

// Pedidos
FanjoyAPI.Orders.create(orderData)
FanjoyAPI.Orders.getMyOrders()

// Clientes
FanjoyAPI.Customers.getProfile()
FanjoyAPI.Customers.updateProfile(data)
FanjoyAPI.Customers.addAddress(address)
FanjoyAPI.Customers.updateAddress(id, address)
FanjoyAPI.Customers.deleteAddress(id)

// Pagamentos
FanjoyAPI.Payments.createPreference(orderId)
FanjoyAPI.Payments.getStatus(orderId)

// Categorias
FanjoyAPI.Categories.getAll()

// Utilitários
FanjoyAPI.Utils.formatCurrency(value)
FanjoyAPI.Utils.formatDate(dateString)
FanjoyAPI.Utils.validateCPF(cpf)
FanjoyAPI.Utils.validateEmail(email)
FanjoyAPI.Utils.maskPhone(value)
FanjoyAPI.Utils.maskCEP(value)
FanjoyAPI.Utils.maskCPF(value)
```

## 🎨 Páginas

### 1. index.html - Loja Principal
**Funcionalidades:**
- Listagem de produtos da API
- Filtros (busca, categoria, preço)
- Adicionar ao carrinho
- Contador de itens no carrinho
- Botão de login/perfil dinâmico

**Integração:** `js/index-integration.js`

### 2. cart.html - Carrinho
**Funcionalidades:**
- Visualizar itens do carrinho
- Alterar quantidade
- Remover itens
- Cálculo de frete e total
- Finalizar compra (cria pedido + pagamento MP)

**Integração:** `js/cart-integration.js`

### 3. customer-login.html - Autenticação
**Funcionalidades:**
- Registro de novos clientes
- Login de clientes existentes
- Validação de campos
- Máscaras de telefone
- Redirecionamento após login

**Integração:** `js/login-integration.js`

### 4. customer-profile.html - Perfil
**Funcionalidades:**
- **Aba Dados Pessoais:**
  - Editar nome, email, telefone, CPF
  - Salvar alterações na API
- **Aba Endereços:**
  - CRUD completo de endereços
  - Definir endereço padrão
- **Aba Pedidos:**
  - Histórico de pedidos
  - Status e rastreamento

**Integração:** `js/profile-integration.js`

### 5. admin.html - Painel Admin
**Funcionalidades:**
- Gerenciar produtos
- Gerenciar categorias
- Visualizar pedidos
- Dashboard com estatísticas

**Nota:** Admin ainda usa localStorage (não integrado com API nesta versão)

## 🔐 Autenticação

O sistema usa **JWT (JSON Web Tokens)** armazenados no localStorage:

```javascript
// Verificar se está logado
if (FanjoyAPI.Auth.isAuthenticated()) {
  // Usuário logado
}

// Token é enviado automaticamente em todas as requisições
// Via header: Authorization: Bearer <token>
```

**SessionStorage:**
- `fanjoy_customer_logged`: "true" se logado
- `fanjoy_customer_id`: ID do cliente
- `fanjoy_customer_name`: Nome do cliente

## 💳 Fluxo de Pagamento (Mercado Pago)

1. **Cliente adiciona produtos ao carrinho**
2. **Clica em "Finalizar Compra"**
3. **Sistema verifica login e endereço**
4. **Cria pedido na API** (`POST /api/orders`)
5. **Cria preferência de pagamento** (`POST /api/payments/create-preference`)
6. **Redireciona para Mercado Pago** (SDK abre checkout)
7. **Cliente paga com cartão/PIX/boleto**
8. **Mercado Pago notifica via Webhook**
9. **Backend atualiza status do pedido**
10. **Cliente vê pedido em "Meus Pedidos"**

## 🛠️ Desenvolvimento

### Modificar Configurações:

**URL da API:**
```javascript
// js/api.js linha 7
const API_CONFIG = {
  baseURL: 'SUA_URL_AQUI',
};
```

**Mercado Pago:**
```javascript
// js/api.js linha 13
const MERCADOPAGO_PUBLIC_KEY = 'SUA_KEY_AQUI';
```

### Adicionar Nova Funcionalidade:

1. **Criar função em `js/api.js`:**
```javascript
const MinhaNovaAPI = {
  async minhaFuncao() {
    return await apiRequest('/meu-endpoint');
  }
};

window.FanjoyAPI.MinhaAPI = MinhaNovaAPI;
```

2. **Usar na página:**
```javascript
const response = await FanjoyAPI.MinhaAPI.minhaFuncao();
```

## 🧪 Testar Localmente

```bash
# 1. Iniciar backend
cd backend
npm run dev

# 2. Abrir frontend
# Usar Live Server ou http-server

# 3. Testar fluxo:
# - Registrar conta
# - Fazer login
# - Adicionar produtos
# - Criar pedido
# - (Opcional) Testar pagamento
```

**Veja guia completo:** [GUIA-TESTES.md](GUIA-TESTES.md)

## 🚀 Deploy

### Vercel (Recomendado para Frontend)

```bash
npm install -g vercel
vercel
vercel --prod
```

### Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod
```

### GitHub Pages

1. Criar repo no GitHub
2. Push dos arquivos
3. Settings > Pages
4. Branch: main
5. Salvar

**⚠️ Importante:** Após deploy, atualize a URL da API em `js/api.js`!

## 📊 Estrutura dos Dados

### LocalStorage (Frontend Only):
- `fanjoy_cart`: Carrinho de compras
- `fanjoy_token`: JWT token de autenticação

### SessionStorage:
- `fanjoy_customer_logged`: Status de login
- `fanjoy_customer_id`: ID do cliente
- `fanjoy_customer_name`: Nome do cliente
- `fanjoy_checkout_redirect`: Flag para redirecionar após login

## 🔒 Segurança

- ✅ Senhas nunca são armazenadas no frontend
- ✅ JWT é validado em cada requisição
- ✅ Token expira automaticamente
- ✅ Logout limpa todos os dados
- ✅ Rotas protegidas redirecionam para login

## 🐛 Debug

### DevTools Console:

```javascript
// Ver token
localStorage.getItem('fanjoy_token')

// Ver carrinho
localStorage.getItem('fanjoy_cart')

// Testar API manualmente
await FanjoyAPI.Products.getAll()
await FanjoyAPI.Auth.login({email: 'teste@teste.com', password: '123456'})
```

### Network Tab:
- Verifique requisições para `/api/*`
- Status 200: Sucesso
- Status 401: Não autorizado (fazer login)
- Status 500: Erro no servidor

## ⚠️ Problemas Comuns

### "Erro ao conectar API"
- Backend não está rodando
- URL errada em `js/api.js`
- CORS bloqueando (adicionar origem no backend)

### "Produtos não aparecem"
- Backend sem produtos (rodar `node init-db.js`)
- API retornando erro
- Verificar console do navegador

### "Mercado Pago não funciona"
- PUBLIC_KEY não configurada
- Credenciais inválidas
- Usar cartões de teste primeiro

### "Não consigo fazer login"
- Criar conta primeiro
- Backend não está rodando
- Verificar email/senha

## 📚 Recursos

- **Mercado Pago:** https://www.mercadopago.com.br/developers
- **JWT:** https://jwt.io/
- **Fetch API:** https://developer.mozilla.org/pt-BR/docs/Web/API/Fetch_API

## 📞 Suporte

Problemas? Verifique:
1. Console do navegador (F12)
2. Network tab (requisições)
3. [GUIA-TESTES.md](GUIA-TESTES.md)
4. [COMO-COLOCAR-ONLINE.md](COMO-COLOCAR-ONLINE.md)

---

**Desenvolvido para Fanjoy Lab** 🛍️
