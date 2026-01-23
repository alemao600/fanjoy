# Backend - Fanjoy Lab API

API RESTful completa para e-commerce com Node.js, Express e MongoDB.

## 🚀 Início Rápido

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# Inicializar banco de dados
node init-db.js

# Iniciar servidor de desenvolvimento
npm run dev

# Iniciar servidor de produção
npm start
```

## 📋 Estrutura do Projeto

```
backend/
├── models/           # Modelos do MongoDB
│   ├── Customer.js   # Cliente
│   ├── Product.js    # Produto
│   ├── Order.js      # Pedido
│   ├── Category.js   # Categoria
│   └── Admin.js      # Administrador
├── routes/           # Rotas da API
│   ├── auth.js       # Autenticação
│   ├── customers.js  # Clientes
│   ├── products.js   # Produtos
│   ├── orders.js     # Pedidos
│   ├── payments.js   # Pagamentos
│   ├── categories.js # Categorias
│   └── admin.js      # Admin
├── middleware/       # Middlewares
│   └── auth.js       # Autenticação JWT
├── server.js         # Servidor principal
├── init-db.js        # Script de inicialização
├── package.json      # Dependências
└── .env.example      # Exemplo de variáveis
```

## 🔌 API Endpoints

### Autenticação
- `POST /api/auth/register` - Registrar cliente
- `POST /api/auth/login` - Login de cliente
- `POST /api/auth/admin/login` - Login de admin

### Produtos
- `GET /api/products` - Listar produtos
- `GET /api/products/:id` - Obter produto
- `POST /api/admin/products` - Criar produto (admin)
- `PUT /api/admin/products/:id` - Atualizar produto (admin)
- `DELETE /api/admin/products/:id` - Deletar produto (admin)

### Pedidos
- `POST /api/orders` - Criar pedido
- `GET /api/orders` - Listar meus pedidos
- `GET /api/orders/:id` - Obter pedido
- `GET /api/admin/orders` - Listar todos pedidos (admin)
- `PUT /api/admin/orders/:id/status` - Atualizar status (admin)

### Clientes
- `GET /api/customers/profile` - Obter perfil
- `PUT /api/customers/profile` - Atualizar perfil
- `POST /api/customers/addresses` - Adicionar endereço
- `PUT /api/customers/addresses/:id` - Atualizar endereço
- `DELETE /api/customers/addresses/:id` - Deletar endereço

### Pagamentos
- `POST /api/payments/create-preference` - Criar pagamento
- `GET /api/payments/status/:orderId` - Verificar status
- `POST /api/payments/webhook` - Webhook Mercado Pago

### Categorias
- `GET /api/categories` - Listar categorias
- `POST /api/admin/categories` - Criar categoria (admin)

### Admin
- `GET /api/admin/dashboard` - Dashboard com estatísticas

## 🔐 Autenticação

A API usa JWT (JSON Web Tokens). Para rotas protegidas, envie o token no header:

```javascript
headers: {
  'Authorization': 'Bearer seu_token_aqui'
}
```

## 💳 Pagamentos

### Mercado Pago

1. Configure credenciais no `.env`
2. Use `/payments/create-preference` para criar pagamento
3. Redirecione cliente para `init_point` retornado
4. Webhook atualiza status automaticamente

### Stripe (Alternativa)

Descomente código em `routes/payments.js` e configure credenciais.

## 🗄️ Banco de Dados

### Modelos

**Customer:**
- name, lastName, email, password
- phone, cpf
- addresses[] (múltiplos endereços)
- orders[] (referência aos pedidos)

**Product:**
- name, description, price
- images[] (múltiplas imagens)
- categories[] (múltiplas categorias)
- tag, buttonText
- stock, sales, views

**Order:**
- customer (ref)
- items[] (produtos, quantidade, preço)
- subtotal, shipping, total
- status, paymentStatus
- shippingAddress, trackingCode

**Category:**
- name, slug, description

**Admin:**
- username, email, password
- role (admin, super_admin)

## 🛠️ Desenvolvimento

```bash
# Instalar nodemon globalmente (auto-reload)
npm install -g nodemon

# Rodar em modo desenvolvimento
npm run dev

# Verificar logs
# Os logs aparecem no console
```

## 🌐 Deploy

### Railway (Recomendado)

```bash
npm install -g @railway/cli
railway login
railway up
```

### Heroku

```bash
heroku create fanjoy-api
git push heroku main
heroku config:set MONGODB_URI="..."
```

### Variáveis de Ambiente Necessárias:

- `PORT` - Porta do servidor
- `MONGODB_URI` - String de conexão MongoDB
- `JWT_SECRET` - Chave secreta JWT
- `MERCADOPAGO_ACCESS_TOKEN` - Token Mercado Pago
- `MERCADOPAGO_PUBLIC_KEY` - Public key Mercado Pago
- `FRONTEND_URL` - URL do frontend (CORS)

## 🔒 Segurança

- Senhas hasheadas com bcrypt
- JWT para autenticação
- Rate limiting (100 req/15min)
- Helmet para headers de segurança
- CORS configurado
- Validação de inputs

## 📊 Monitoramento

```bash
# Logs do Railway
railway logs

# Logs do Heroku
heroku logs --tail

# Verificar saúde da API
curl https://sua-api.com/api/health
```

## 🐛 Debug

```bash
# Testar conexão MongoDB
node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('OK'))"

# Testar credenciais Mercado Pago
node -e "const mp = require('mercadopago'); mp.configure({access_token: process.env.MERCADOPAGO_ACCESS_TOKEN}); console.log('OK')"
```

## 📚 Documentação

- [Express](https://expressjs.com/)
- [Mongoose](https://mongoosejs.com/)
- [JWT](https://jwt.io/)
- [Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs)

## ⚠️ Notas

- Em desenvolvimento, use MongoDB local ou Atlas
- Em produção, sempre use HTTPS
- Mantenha `.env` secreto (nunca commite!)
- Faça backup regular do banco de dados
- Configure alertas de erro

## 📞 Suporte

Para problemas ou dúvidas:
1. Verifique os logs do servidor
2. Consulte a documentação oficial
3. Teste endpoints com Postman

---

**Desenvolvido para Fanjoy Lab** 🛍️
