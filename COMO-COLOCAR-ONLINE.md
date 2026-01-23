# 🚀 GUIA RÁPIDO: Como Colocar seu Site Online

## 📋 Resumo do que você precisa fazer:

### 1️⃣ **Configurar o Backend (API)**
### 2️⃣ **Configurar o Banco de Dados**
### 3️⃣ **Configurar os Pagamentos**
### 4️⃣ **Colocar o Frontend Online**
### 5️⃣ **Conectar Tudo**

---

## 1️⃣ BACKEND - API (15 minutos)

### Opção A: Railway (GRÁTIS e FÁCIL) ⭐ Recomendado

```bash
# 1. Criar conta no Railway
https://railway.app/

# 2. Instalar Railway CLI
npm install -g @railway/cli

# 3. Fazer login
railway login

# 4. Ir para pasta backend
cd backend

# 5. Fazer deploy
railway up

# 6. Anotar a URL gerada (ex: fanjoy-api.railway.app)
```

**Configurar Variáveis no Railway:**
- Ir no dashboard do Railway
- Clicar em "Variables"
- Adicionar:
  - `MONGODB_URI` (veja passo 2)
  - `JWT_SECRET` (qualquer texto longo e aleatório)
  - `MERCADOPAGO_ACCESS_TOKEN` (veja passo 3)
  - `MERCADOPAGO_PUBLIC_KEY` (veja passo 3)
  - `FRONTEND_URL` (será sua URL do site)

### Opção B: Heroku (Grátis com cartão)

```bash
# 1. Criar conta em https://heroku.com
# 2. Instalar CLI: https://devcenter.heroku.com/articles/heroku-cli
# 3. Fazer login
heroku login

# 4. Criar app
cd backend
heroku create fanjoy-api

# 5. Configurar variáveis
heroku config:set MONGODB_URI="sua_string"
heroku config:set JWT_SECRET="texto_secreto"

# 6. Deploy
git push heroku main
```

---

## 2️⃣ BANCO DE DADOS - MongoDB Atlas (10 minutos)

### Criar Banco GRÁTIS:

1. **Criar conta:**
   - Ir em https://www.mongodb.com/cloud/atlas
   - Clicar em "Try Free"
   - Criar conta

2. **Criar Cluster:**
   - Clicar em "Build a Database"
   - Escolher "Shared" (FREE)
   - Região: São Paulo (ou mais próxima)
   - Criar

3. **Configurar acesso:**
   - **Username:** criar usuário (ex: fanjoy)
   - **Password:** criar senha forte
   - **Network:** Adicionar IP 0.0.0.0/0 (permitir todos)

4. **Obter String de Conexão:**
   - Clicar em "Connect"
   - "Connect your application"
   - Copiar a string
   - Substituir `<password>` pela sua senha
   - Exemplo:
     ```
     mongodb+srv://fanjoy:senha123@cluster0.abc.mongodb.net/fanjoy-lab
     ```

5. **Adicionar no Railway/Heroku:**
   - Cole essa string na variável `MONGODB_URI`

6. **Inicializar banco:**
   ```bash
   cd backend
   node init-db.js
   ```

---

## 3️⃣ PAGAMENTOS - Mercado Pago (15 minutos)

### Criar Conta e Obter Credenciais:

1. **Criar conta:**
   - Ir em https://www.mercadopago.com.br/developers
   - Fazer login ou criar conta

2. **Obter credenciais de TESTE:**
   - Ir em "Suas integrações"
   - Clicar em "Credenciais"
   - Selecionar modo "Teste"
   - Copiar:
     - `Access Token` (começa com APP_USR-)
     - `Public Key` (começa com APP_USR-)

3. **Adicionar no Backend:**
   - Railway/Heroku:
     - `MERCADOPAGO_ACCESS_TOKEN` = seu access token
     - `MERCADOPAGO_PUBLIC_KEY` = sua public key

4. **Configurar Webhook:**
   - No painel do Mercado Pago
   - Ir em "Webhooks"
   - Adicionar URL:
     ```
     https://sua-api.railway.app/api/payments/webhook
     ```
   - Selecionar evento "payments"

5. **Quando for REAL:**
   - Mudar para modo "Produção"
   - Copiar novas credenciais
   - Atualizar no backend

### Testar Pagamentos:

Use estes cartões de teste:

✅ **Aprovado:**
- Número: 5031 4332 1540 6351
- CVV: 123
- Validade: 11/25

❌ **Rejeitado:**
- Número: 5031 7557 3453 0604

---

## 4️⃣ FRONTEND - Site (5 minutos)

### Opção A: Vercel (GRÁTIS) ⭐ Recomendado

```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Ir para pasta do site (onde está index.html)
cd c:\Users\Alemao\Downloads\fanjoy

# 3. Deploy
vercel

# Seguir as instruções:
# - Set up and deploy? Y
# - Which scope? Sua conta
# - Link to project? N
# - Project name? fanjoy-lab
# - Directory? ./
# - Override settings? N

# 4. Deploy de produção
vercel --prod

# URL será algo como: fanjoy-lab.vercel.app
```

### Opção B: Netlify

```bash
# 1. Instalar CLI
npm install -g netlify-cli

# 2. Deploy
netlify deploy --prod

# 3. Selecionar pasta do projeto
# URL será algo como: fanjoy-lab.netlify.app
```

### Opção C: GitHub Pages (GRÁTIS)

1. Criar repositório no GitHub
2. Upload dos arquivos
3. Settings > Pages
4. Branch: main
5. Salvar

---

## 5️⃣ CONECTAR TUDO (5 minutos)

### Atualizar Frontend com URLs Reais:

Editar `js/api.js`:

```javascript
const API_CONFIG = {
  // Mudar para sua URL do Railway/Heroku
  baseURL: 'https://fanjoy-api.railway.app/api',
  timeout: 10000
};

// Adicionar sua PUBLIC KEY do Mercado Pago
const MERCADOPAGO_PUBLIC_KEY = 'APP_USR-sua-public-key-aqui';
```

### Fazer novo deploy do frontend:

```bash
vercel --prod
# ou
netlify deploy --prod
```

### Testar Tudo:

1. ✅ Abrir seu site
2. ✅ Criar conta
3. ✅ Adicionar endereço
4. ✅ Adicionar produto ao carrinho
5. ✅ Finalizar compra
6. ✅ Fazer pagamento de teste

---

## 📊 CHECKLIST FINAL

Antes de lançar para o público:

- [ ] Backend rodando (teste: `https://sua-api.com/api/health`)
- [ ] Banco de dados conectado
- [ ] Produtos cadastrados no admin
- [ ] Pagamento de teste funcionando
- [ ] Frontend conectado à API
- [ ] Webhook do Mercado Pago configurado
- [ ] SSL/HTTPS ativo (automático no Vercel/Railway)
- [ ] Criar conta e testar fluxo completo
- [ ] Mudar para credenciais de PRODUÇÃO do Mercado Pago

---

## 💰 CUSTOS (para começar tudo é GRÁTIS!)

| Serviço | Plano Grátis | Quando Pagar |
|---------|-------------|--------------|
| **Railway** | 500h/mês grátis | Depois: $5/mês |
| **MongoDB Atlas** | 512MB grátis | Depois: $9/mês |
| **Vercel** | Ilimitado grátis | Nunca (para sites estáticos) |
| **Mercado Pago** | Grátis | Taxa por venda (±5%) |

**Você pode começar 100% GRÁTIS e só pagar quando tiver vendas!**

---

## 🆘 PROBLEMAS COMUNS

### "Erro ao conectar API"
- Verificar se backend está online
- Verificar URL no `api.js`
- Verificar CORS no backend

### "Pagamento não funciona"
- Verificar credenciais do Mercado Pago
- Usar cartões de teste corretos
- Verificar logs no painel do MP

### "Banco de dados não conecta"
- Verificar string de conexão
- Verificar se IP está liberado (0.0.0.0/0)
- Testar conexão com MongoDB Compass

---

## 📞 LINKS ÚTEIS

- **Railway:** https://railway.app/
- **MongoDB Atlas:** https://www.mongodb.com/cloud/atlas
- **Mercado Pago:** https://www.mercadopago.com.br/developers
- **Vercel:** https://vercel.com/
- **Documentação completa:** Ver `GUIA-DEPLOY.md`

---

## 🎉 PRONTO!

Seu site estará online em:
- **Frontend:** https://fanjoy-lab.vercel.app
- **Backend:** https://fanjoy-api.railway.app
- **Admin:** https://fanjoy-lab.vercel.app/admin.html

**Total de tempo: ~50 minutos**
**Custo inicial: R$ 0,00**

Boa sorte com sua loja! 🚀🛍️
