# 🚀 INÍCIO RÁPIDO - Fanjoy Lab

## ⚡ Em 5 Minutos

```bash
# 1. Instalar dependências do backend
cd backend
npm install

# 2. Criar arquivo .env
cp .env.example .env
# Edite o .env e preencha:
# - MONGODB_URI (MongoDB Atlas ou local)
# - JWT_SECRET (qualquer texto longo)
# - Mercado Pago (opcional para começar)

# 3. Inicializar banco de dados
node init-db.js

# 4. Iniciar backend
npm run dev

# 5. Abrir frontend
# Em outra janela do terminal, volte para a raiz:
cd ..
# Abra index.html no navegador ou use Live Server
```

## 📋 Pré-requisitos

- **Node.js** 16+ ([baixar](https://nodejs.org/))
- **MongoDB** (Atlas grátis ou local)
- **Editor:** VS Code recomendado
- **Navegador:** Chrome/Firefox/Edge

---

## 🗄️ MongoDB - Setup Rápido

### Opção A: MongoDB Atlas (Cloud - GRÁTIS)

1. **Criar conta:** https://www.mongodb.com/cloud/atlas
2. **Criar cluster:**
   - Clicar "Build a Database"
   - Escolher "Shared" (FREE)
   - Região: São Paulo
3. **Criar usuário:**
   - Username: `fanjoy`
   - Password: `senha123` (ou outra)
4. **Liberar IP:**
   - Network Access
   - Add IP: `0.0.0.0/0` (permitir todos)
5. **Obter string de conexão:**
   - Clicar em "Connect"
   - "Connect your application"
   - Copiar a string
   - Substituir `<password>` pela sua senha

Exemplo:
```
mongodb+srv://fanjoy:senha123@cluster0.xxxxx.mongodb.net/fanjoy-lab
```

### Opção B: MongoDB Local

```bash
# Windows (com Chocolatey)
choco install mongodb

# Mac (com Homebrew)
brew tap mongodb/brew
brew install mongodb-community

# Linux (Ubuntu)
sudo apt-get install mongodb

# Iniciar MongoDB
mongod
```

String de conexão local:
```
mongodb://localhost:27017/fanjoy-lab
```

---

## ⚙️ Configurar Backend

### 1. Editar `backend/.env`

```env
# Porta do servidor
PORT=5000

# MongoDB
MONGODB_URI=mongodb+srv://fanjoy:senha123@cluster0.xxxxx.mongodb.net/fanjoy-lab

# JWT Secret (gere um texto aleatório)
JWT_SECRET=meu-super-secret-key-123456789

# Mercado Pago (opcional - deixe vazio por enquanto)
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_PUBLIC_KEY=

# Frontend URL
FRONTEND_URL=http://localhost:5500

# Ambiente
NODE_ENV=development
```

### 2. Instalar e Iniciar

```bash
cd backend

# Instalar
npm install

# Inicializar banco (criar dados de teste)
node init-db.js

# Deve mostrar:
# ✅ MongoDB conectado
# 👤 Admin criado: admin
# 📦 5 categorias criadas
# 🎁 6 produtos criados
# 👤 Cliente de teste criado: cliente@teste.com
# 
# 📝 Credenciais:
# Admin:
#   Email: admin@fanjoy.com
#   Senha: Admin@123456
# Cliente:
#   Email: cliente@teste.com
#   Senha: teste123

# Iniciar servidor
npm run dev

# Deve mostrar:
# ✅ MongoDB conectado
# 🚀 Servidor rodando na porta 5000
```

### 3. Testar Backend

```bash
# Em outro terminal:
curl http://localhost:5000/api/health
# Deve retornar: {"status":"OK"}

# Testar login:
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"cliente@teste.com","password":"teste123"}'
# Deve retornar um token JWT
```

---

## 🎨 Configurar Frontend

### 1. Editar `js/api.js`

```javascript
// Linha 7 - Configurar URL da API
const API_CONFIG = {
  baseURL: 'http://localhost:5000/api',  // ✅ Manter assim para desenvolvimento local
  timeout: 10000
};

// Linha 13 - Mercado Pago (opcional)
const MERCADOPAGO_PUBLIC_KEY = 'SUA_PUBLIC_KEY_AQUI';  // Deixe assim por enquanto
```

### 2. Abrir no Navegador

**Opção A: Live Server (VS Code)**
- Instalar extensão "Live Server"
- Clicar com direito em `index.html`
- "Open with Live Server"
- Abre em: http://localhost:5500

**Opção B: Python**
```bash
python -m http.server 8000
# Abrir: http://localhost:8000
```

**Opção C: Node http-server**
```bash
npm install -g http-server
http-server
# Abrir: http://localhost:8080
```

**Opção D: Abrir diretamente**
- Abrir `index.html` direto no navegador
- Pode ter problema com CORS - prefira as opções acima

---

## ✅ Verificar se Funciona

### 1. Abrir DevTools (F12)

Console deve mostrar:
```
✅ Fanjoy API configurada e pronta para uso
📡 API URL: http://localhost:5000/api
```

Se aparecer erro:
```
❌ Erro ao conectar API
```
→ Backend não está rodando ou URL errada

### 2. Testar Produtos

- Produtos devem aparecer na página
- Se não aparecer, verificar:
  - Console do navegador (F12)
  - Console do backend (terminal)
  - Verificar se `node init-db.js` foi executado

### 3. Testar Login

1. Clicar em "Login"
2. Usar credenciais de teste:
   - Email: `cliente@teste.com`
   - Senha: `teste123`
3. Deve redirecionar para perfil

### 4. Testar Carrinho

1. Voltar para página inicial
2. Adicionar produto ao carrinho
3. Contador deve aumentar
4. Clicar no ícone do carrinho
5. Produto deve aparecer

---

## 🐛 Problemas Comuns

### "Cannot connect to MongoDB"
- Verificar se string de conexão está correta no `.env`
- Se usar Atlas, verificar se IP está liberado (0.0.0.0/0)
- Verificar se usuário e senha estão corretos

### "Port 5000 already in use"
- Mudar porta no `.env`: `PORT=3000`
- Ou matar o processo:
  ```bash
  # Windows
  netstat -ano | findstr :5000
  taskkill /PID <número> /F
  
  # Mac/Linux
  lsof -ti:5000 | xargs kill -9
  ```

### "Products not loading"
- Verificar se backend está rodando
- Verificar URL em `js/api.js`
- Verificar console do navegador (F12)
- Executar `node init-db.js` novamente

### "CORS Error"
- Adicionar sua URL no `backend/server.js`:
  ```javascript
  app.use(cors({
    origin: ['http://localhost:5500', 'http://localhost:8000']
  }));
  ```

---

## 🧪 Próximos Passos

Agora que está funcionando:

1. **Ler documentação:**
   - [README.md](README.md) - Visão geral
   - [GUIA-TESTES.md](GUIA-TESTES.md) - Como testar tudo
   - [CHECKLIST.md](CHECKLIST.md) - Lista completa de tarefas

2. **Testar funcionalidades:**
   - Criar nova conta
   - Adicionar endereço
   - Fazer um pedido

3. **Configurar Mercado Pago:**
   - Criar conta: https://www.mercadopago.com.br/developers
   - Obter credenciais de teste
   - Configurar no `.env` e `js/api.js`
   - Testar pagamento

4. **Deploy:**
   - Seguir [COMO-COLOCAR-ONLINE.md](COMO-COLOCAR-ONLINE.md)
   - Backend: Railway ou Heroku
   - Frontend: Vercel ou Netlify

---

## 📞 Ajuda

Se algo não funcionar:

1. **Verificar logs:**
   - Console do navegador (F12)
   - Terminal do backend
   
2. **Validar projeto:**
   ```bash
   node validate.js
   ```

3. **Conferir checklist:**
   - Abrir [CHECKLIST.md](CHECKLIST.md)
   - Marcar o que foi feito
   - Ver o que falta

4. **Recursos:**
   - MongoDB: https://www.mongodb.com/docs
   - Express: https://expressjs.com/
   - Mercado Pago: https://www.mercadopago.com.br/developers

---

## 🎉 Pronto!

Seu e-commerce está rodando localmente!

**Estrutura:**
- Frontend: http://localhost:5500
- Backend: http://localhost:5000
- MongoDB: Atlas ou local

**Credenciais de teste:**
- Cliente: cliente@teste.com / teste123
- Admin: admin@fanjoy.com / Admin@123456

**Continue:** Siga o [GUIA-TESTES.md](GUIA-TESTES.md) para testar todas as funcionalidades.

---

**Desenvolvido para Fanjoy Lab** 🛍️
