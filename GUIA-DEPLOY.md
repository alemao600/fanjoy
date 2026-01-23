# 🚀 Guia Completo de Deploy - Fanjoy Lab

## 📋 Índice
1. [Pré-requisitos](#pré-requisitos)
2. [Instalação Local](#instalação-local)
3. [Configuração do Banco de Dados](#configuração-do-banco-de-dados)
4. [Integração de Pagamentos](#integração-de-pagamentos)
5. [Deploy em Produção](#deploy-em-produção)
6. [Configuração do Frontend](#configuração-do-frontend)

---

## 🔧 Pré-requisitos

### Necessário Instalar:
- **Node.js** (v18 ou superior) - [Download](https://nodejs.org/)
- **MongoDB** - [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (recomendado) ou local
- **Git** - [Download](https://git-scm.com/)

### Contas Necessárias:
- **MongoDB Atlas** (gratuito) - Para banco de dados
- **Mercado Pago** - Para pagamentos (ou Stripe)
- **Vercel/Railway/Heroku** - Para hospedagem (opcional)

---

## 💻 Instalação Local

### Passo 1: Instalar Dependências do Backend

```bash
# Navegue até a pasta backend
cd backend

# Instale as dependências
npm install
```

### Passo 2: Configurar Variáveis de Ambiente

```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite o arquivo .env com seus dados
notepad .env  # Windows
# ou
nano .env     # Linux/Mac
```

### Passo 3: Iniciar o Servidor

```bash
# Desenvolvimento (com auto-reload)
npm run dev

# Produção
npm start
```

O servidor estará rodando em `http://localhost:5000`

---

## 🗄️ Configuração do Banco de Dados

### Opção 1: MongoDB Atlas (Recomendado - Grátis)

1. **Criar Conta:**
   - Acesse [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Crie uma conta gratuita

2. **Criar Cluster:**
   - Clique em "Build a Database"
   - Escolha "Shared" (Free)
   - Selecione a região mais próxima (ex: São Paulo)
   - Clique em "Create Cluster"

3. **Configurar Acesso:**
   - **Database Access:** Crie um usuário com senha
   - **Network Access:** Adicione seu IP (ou 0.0.0.0/0 para acesso público)

4. **Obter String de Conexão:**
   - Clique em "Connect"
   - Escolha "Connect your application"
   - Copie a string de conexão
   - Substitua `<password>` pela sua senha
   - Cole no arquivo `.env`:
   
   ```env
   MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/fanjoy-lab?retryWrites=true&w=majority
   ```

### Opção 2: MongoDB Local

```bash
# Instalar MongoDB localmente
# Windows: https://www.mongodb.com/try/download/community
# Linux: sudo apt install mongodb
# Mac: brew install mongodb-community

# No .env use:
MONGODB_URI=mongodb://localhost:27017/fanjoy-lab
```

---

## 💳 Integração de Pagamentos

### Mercado Pago (Recomendado para Brasil)

#### Passo 1: Criar Conta
1. Acesse [Mercado Pago Developers](https://www.mercadopago.com.br/developers)
2. Crie ou faça login na sua conta

#### Passo 2: Obter Credenciais
1. Vá em "Suas integrações" > "Credenciais"
2. Escolha o modo:
   - **Teste:** Para desenvolvimento
   - **Produção:** Para site real

3. Copie suas credenciais:
   ```env
   MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
   MERCADOPAGO_PUBLIC_KEY=APP_USR-...
   ```

#### Passo 3: Configurar Webhook
1. No painel do Mercado Pago, vá em "Webhooks"
2. Configure a URL do webhook:
   ```
   https://seu-dominio.com/api/payments/webhook
   ```
3. Selecione o evento "payments"

#### Passo 4: Testar Pagamentos
Use os [cartões de teste](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/test/cards):

**Cartão Aprovado:**
- Número: 5031 4332 1540 6351
- CVV: 123
- Validade: 11/25

**Cartão Rejeitado:**
- Número: 5031 7557 3453 0604
- CVV: 123
- Validade: 11/25

### Alternativa: Stripe

```bash
# Instalar SDK do Stripe
npm install stripe

# Obter credenciais em https://dashboard.stripe.com/apikeys
```

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
```

---

## 🌐 Deploy em Produção

### Opção 1: Railway (Recomendado - Fácil e Grátis)

1. **Criar Conta:**
   - Acesse [Railway.app](https://railway.app/)
   - Faça login com GitHub

2. **Fazer Deploy:**
   ```bash
   # Instalar Railway CLI
   npm install -g @railway/cli
   
   # Login
   railway login
   
   # Deploy
   cd backend
   railway up
   ```

3. **Configurar Variáveis:**
   - No painel do Railway, vá em "Variables"
   - Adicione todas as variáveis do `.env`

4. **Obter URL:**
   - Railway gera uma URL automaticamente
   - Use essa URL como `BACKEND_URL`

### Opção 2: Heroku

```bash
# Instalar Heroku CLI
npm install -g heroku

# Login
heroku login

# Criar app
heroku create fanjoy-lab-api

# Deploy
git push heroku main

# Configurar variáveis
heroku config:set MONGODB_URI="sua_string"
heroku config:set JWT_SECRET="sua_chave"
```

### Opção 3: Vercel (Serverless)

```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
cd backend
vercel

# Configurar variáveis no dashboard da Vercel
```

---

## 🎨 Configuração do Frontend

### Passo 1: Criar Arquivo de Configuração

Crie `frontend/js/config.js`:

```javascript
// Configuração da API
const API_CONFIG = {
  // Desenvolvimento
  baseURL: 'http://localhost:5000/api',
  
  // Produção (descomente e ajuste após deploy)
  // baseURL: 'https://sua-api.railway.app/api',
  
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

// Mercado Pago
const MERCADOPAGO_PUBLIC_KEY = 'SUA_PUBLIC_KEY_AQUI';

// Funções auxiliares
function getAuthToken() {
  return localStorage.getItem('fanjoy_token');
}

function setAuthToken(token) {
  localStorage.setItem('fanjoy_token', token);
}

function clearAuthToken() {
  localStorage.removeItem('fanjoy_token');
}

// Função para fazer requisições à API
async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  
  const config = {
    ...options,
    headers: {
      ...API_CONFIG.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    }
  };

  const response = await fetch(`${API_CONFIG.baseURL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Erro na requisição');
  }

  return data;
}
```

### Passo 2: Adicionar Script do Mercado Pago

No HTML, adicione antes do `</body>`:

```html
<!-- Mercado Pago SDK -->
<script src="https://sdk.mercadopago.com/js/v2"></script>
<script src="js/config.js"></script>
```

### Passo 3: Deploy do Frontend

#### Vercel (Recomendado - Grátis)

```bash
# Instalar Vercel CLI
npm install -g vercel

# Na pasta raiz (onde está index.html)
vercel

# Siga as instruções
# Pronto! Seu site está no ar
```

#### Netlify

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod

# Escolha a pasta raiz do projeto
```

#### GitHub Pages (Grátis)

1. Crie um repositório no GitHub
2. Faça push dos arquivos
3. Vá em Settings > Pages
4. Escolha a branch `main`
5. Pronto!

---

## 🔒 Segurança em Produção

### Checklist Essencial:

- [ ] Trocar `JWT_SECRET` para valor aleatório seguro
- [ ] Usar HTTPS (SSL/TLS)
- [ ] Configurar CORS corretamente
- [ ] Limitar taxa de requisições (rate limiting)
- [ ] Validar todos os inputs
- [ ] Não expor informações sensíveis em logs
- [ ] Usar variáveis de ambiente para credenciais
- [ ] Manter dependências atualizadas
- [ ] Fazer backup regular do banco de dados

---

## 📊 Monitoramento

### Logs do Servidor:

```bash
# Railway
railway logs

# Heroku
heroku logs --tail

# Vercel
vercel logs
```

### Monitorar Banco de Dados:
- MongoDB Atlas possui dashboard com métricas
- Configure alertas de uso e performance

---

## 🐛 Troubleshooting

### Erro: "MongoDB Connection Failed"
- Verifique a string de conexão
- Confirme IP liberado no MongoDB Atlas
- Teste conexão local primeiro

### Erro: "JWT Error"
- Verifique se `JWT_SECRET` está definido
- Confirme se token está sendo enviado no header

### Erro: "Payment Failed"
- Verifique credenciais do Mercado Pago
- Confirme se está usando credenciais de teste
- Verifique logs no painel do Mercado Pago

### Erro: "CORS"
- Configure `FRONTEND_URL` no `.env`
- Adicione domínio correto no CORS

---

## 📞 Suporte

### Documentação Oficial:
- [Node.js](https://nodejs.org/docs)
- [Express](https://expressjs.com/)
- [MongoDB](https://docs.mongodb.com/)
- [Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs)
- [Stripe](https://stripe.com/docs)

### Ferramentas Úteis:
- [Postman](https://www.postman.com/) - Testar API
- [MongoDB Compass](https://www.mongodb.com/products/compass) - Visualizar banco
- [Railway](https://railway.app/) - Hospedagem

---

## ✅ Checklist Final

Antes de lançar:

- [ ] Backend rodando sem erros
- [ ] Banco de dados conectado
- [ ] Pagamentos testados
- [ ] Frontend conectado à API
- [ ] SSL/HTTPS configurado
- [ ] Variáveis de ambiente configuradas
- [ ] Webhook do Mercado Pago funcionando
- [ ] Testes de compra completos
- [ ] Backup do banco configurado
- [ ] Monitoramento ativo

---

**🎉 Parabéns! Sua loja está pronta para o mundo!**

Para dúvidas ou suporte, consulte a documentação oficial de cada ferramenta.
