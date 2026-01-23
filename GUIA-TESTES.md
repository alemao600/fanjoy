# 🧪 GUIA DE TESTES - Fanjoy Lab

## 📋 Pré-requisitos

Antes de testar, certifique-se de que:

- ✅ Backend está rodando (`cd backend && npm run dev`)
- ✅ MongoDB está conectado
- ✅ Arquivo `js/api.js` está configurado com a URL correta da API
- ✅ Credenciais do Mercado Pago estão no `.env` do backend

---

## 🔄 Fluxo de Testes Completo

### 1️⃣ Teste de Produtos (index.html)

**O que testar:**
1. Abra `index.html` no navegador
2. Verifique se os produtos carregam da API
3. Teste o filtro de busca
4. Teste os filtros de categoria
5. Teste os filtros de preço
6. Clique em "Adicionar ao Carrinho"
7. Verifique se o contador do carrinho atualiza

**Resultado esperado:**
- Produtos aparecem na tela
- Filtros funcionam corretamente
- Mensagem "✓ Adicionado" aparece no botão
- Contador do carrinho aumenta

**Console esperado:**
```
✅ Fanjoy API configurada e pronta para uso
📡 API URL: http://localhost:5000/api
```

**Se der erro:**
- Verifique se o backend está rodando
- Abra o DevTools (F12) e veja o console
- Se aparecer erro de CORS, adicione seu domínio no backend em `server.js`

---

### 2️⃣ Teste de Registro (customer-login.html)

**O que testar:**
1. Abra `customer-login.html`
2. Clique na aba "Criar Conta"
3. Preencha todos os campos:
   - Nome: João
   - Sobrenome: Silva
   - Email: joao@teste.com
   - Telefone: (11) 98765-4321
   - Senha: 123456
   - Confirmar Senha: 123456
4. Clique em "Criar Conta"

**Resultado esperado:**
- Mensagem de sucesso verde aparece
- Formulário é resetado
- Após 2 segundos, muda para aba de login
- Email é pré-preenchido

**Console esperado:**
```
POST http://localhost:5000/api/auth/register 201
```

**Possíveis erros:**
- `Email already exists` - Use outro email
- `Validation error` - Verifique os campos
- `Network error` - Backend não está rodando

---

### 3️⃣ Teste de Login (customer-login.html)

**O que testar:**
1. Na aba "Entrar", use:
   - Email: joao@teste.com
   - Senha: 123456
2. Clique em "Entrar"

**Resultado esperado:**
- Mensagem "Login realizado com sucesso!"
- Redireciona para `customer-profile.html`
- Dados do perfil aparecem

**Console esperado:**
```
POST http://localhost:5000/api/auth/login 200
```

**Se der erro:**
- `Invalid credentials` - Verifique email/senha
- `User not found` - Crie a conta primeiro

---

### 4️⃣ Teste de Perfil (customer-profile.html)

**O que testar:**

**ABA "Dados Pessoais":**
1. Verifique se os dados carregaram
2. Edite o nome para "João Pedro"
3. Adicione CPF: 123.456.789-00
4. Clique em "Salvar Alterações"

**Resultado esperado:**
- Mensagem verde "Dados salvos com sucesso!"
- Dados permanecem após reload

**ABA "Endereços":**
1. Clique em "Novo Endereço"
2. Preencha:
   - Label: Casa
   - CEP: 01234-567
   - Rua: Rua das Flores
   - Número: 123
   - Bairro: Centro
   - Cidade: São Paulo
   - Estado: SP
   - Marque "Endereço padrão"
3. Clique em "Salvar Endereço"

**Resultado esperado:**
- Modal fecha
- Endereço aparece na lista
- Badge "Padrão" aparece

**ABA "Pedidos":**
- Deve mostrar "Nenhum pedido realizado ainda"
- Após fazer um pedido, aparecerá aqui

**Console esperado:**
```
GET http://localhost:5000/api/customers/profile 200
PUT http://localhost:5000/api/customers/profile 200
POST http://localhost:5000/api/customers/addresses 201
```

---

### 5️⃣ Teste de Carrinho (cart.html)

**O que testar:**
1. Volte para `index.html`
2. Adicione 2-3 produtos ao carrinho
3. Clique no ícone do carrinho
4. Verifique se os produtos aparecem
5. Teste os botões + e - de quantidade
6. Teste o botão "Remover"
7. Verifique o cálculo do subtotal e frete
8. **NÃO clique em "Finalizar Compra" ainda** (próximo teste)

**Resultado esperado:**
- Produtos aparecem corretamente
- Preços calculam corretamente
- Frete = R$ 15,00 (ou GRÁTIS se > R$ 200)
- Quantidade aumenta/diminui
- Remover funciona

---

### 6️⃣ Teste de Checkout COM Mercado Pago (cart.html)

⚠️ **IMPORTANTE:** Este teste requer credenciais válidas do Mercado Pago

**Preparação:**
1. Certifique-se de que você configurou:
   - `MERCADOPAGO_ACCESS_TOKEN` no `.env` do backend
   - `MERCADOPAGO_PUBLIC_KEY` no `js/api.js`
2. Use credenciais de **TESTE** primeiro

**O que testar:**
1. No `cart.html`, clique em "Finalizar Compra"
2. Se não estiver logado, será redirecionado para login
3. Após login, retorna ao carrinho
4. Clique novamente em "Finalizar Compra"

**Resultado esperado:**
- Console mostra:
  ```
  Criando pedido: {items: [...], shippingAddress: {...}, ...}
  Pedido criado: {_id: "...", orderNumber: "..."}
  ```
- Redireciona para página do Mercado Pago
- Na página do MP, você vê:
  - Lista de produtos
  - Total correto
  - Opções de pagamento

**Testar Pagamento de TESTE:**
Use um destes cartões de teste:

✅ **Aprovar:**
- Número: `5031 4332 1540 6351`
- Nome: APRO
- CVV: 123
- Validade: 11/25

❌ **Rejeitar:**
- Número: `5031 7557 3453 0604`

**Após pagamento:**
1. Você será redirecionado de volta
2. Verifique no backend se o pedido foi atualizado
3. Verifique em "Meus Pedidos" se aparece

**Console esperado:**
```
POST http://localhost:5000/api/orders 201
POST http://localhost:5000/api/payments/create-preference 200
(Redireciona para Mercado Pago)
```

**Webhook:**
- O Mercado Pago enviará uma notificação para `/api/payments/webhook`
- O status do pedido será atualizado automaticamente
- Verifique no MongoDB Compass ou admin panel

---

### 7️⃣ Teste de Checkout SEM Mercado Pago (Simulação)

Se você ainda não tem credenciais do MP, pode testar assim:

**Modificar temporariamente `js/cart-integration.js`:**

Encontre a função `checkout()` e comente a parte do pagamento:

```javascript
async function checkout() {
  // ... código existente ...

  const orderResponse = await FanjoyAPI.Orders.create(orderData);
  
  if (!orderResponse.success) {
    throw new Error(orderResponse.message || 'Erro ao criar pedido');
  }

  const order = orderResponse.data;
  console.log('Pedido criado:', order);

  // COMENTAR ESTAS LINHAS TEMPORARIAMENTE:
  // const paymentResponse = await FanjoyAPI.Payments.createPreference(order._id);
  // if (!paymentResponse.success) {
  //   throw new Error(paymentResponse.message || 'Erro ao criar pagamento');
  // }

  // Limpar carrinho
  cart = [];
  saveCart();

  // ADICIONAR ESTA LINHA:
  alert('Pedido criado com sucesso! #' + order.orderNumber);
  window.location.href = 'customer-profile.html';

  // COMENTAR ESTA LINHA:
  // window.location.href = paymentResponse.data.init_point;
}
```

Agora o checkout criará o pedido mas não tentará integrar com MP.

---

## 🔍 Testes de Integração

### Teste 1: Verificar Stock

1. No backend, altere o stock de um produto para 1
2. Adicione 2 unidades ao carrinho
3. Tente finalizar a compra

**Resultado esperado:**
- Erro: "Stock insuficiente"

### Teste 2: Logout e Segurança

1. Faça logout
2. Tente acessar `customer-profile.html` direto na URL

**Resultado esperado:**
- Redireciona para `customer-login.html`

### Teste 3: Token Expirado

1. Faça login
2. No Application > LocalStorage, copie o token
3. No backend, mude o `JWT_SECRET` no `.env`
4. Recarregue o perfil

**Resultado esperado:**
- Token inválido
- Redireciona para login

---

## 🐛 Problemas Comuns

### "Erro ao conectar API"
**Causa:** Backend não está rodando ou URL errada
**Solução:**
```bash
cd backend
npm run dev
# Verifique se aparece: "✅ MongoDB conectado"
```

### "CORS Error"
**Causa:** Frontend está em domínio diferente do backend
**Solução:** No `backend/server.js`, adicione sua URL:
```javascript
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'SUA_URL_AQUI']
}));
```

### "Mercado Pago não inicializado"
**Causa:** PUBLIC_KEY não configurada
**Solução:** Edite `js/api.js`:
```javascript
const MERCADOPAGO_PUBLIC_KEY = 'APP_USR-sua-key-aqui';
```

### "Network request failed"
**Causa:** Backend não responde
**Verificar:**
```bash
# Testar diretamente:
curl http://localhost:5000/api/health
# Deve retornar: {"status":"OK"}
```

### "Produtos não aparecem"
**Causa:** Banco vazio
**Solução:**
```bash
cd backend
node init-db.js
```

---

## ✅ Checklist Final

Antes de considerar pronto:

- [ ] Produtos carregam da API
- [ ] Registro de cliente funciona
- [ ] Login funciona
- [ ] Dados pessoais salvam
- [ ] Endereços CRUD funciona
- [ ] Adicionar ao carrinho funciona
- [ ] Checkout cria pedido
- [ ] Integração Mercado Pago funciona
- [ ] Webhook atualiza status
- [ ] Pedidos aparecem no perfil
- [ ] Logout funciona
- [ ] Segurança (token) funciona

---

## 📊 Monitoramento

### No Console do Navegador (F12):

**Sucesso:**
```
✅ Fanjoy API configurada e pronta para uso
📡 API URL: http://localhost:5000/api
✅ Mercado Pago inicializado
```

**Erros para investigar:**
```
❌ Erro ao carregar produtos
⚠️ Mercado Pago não inicializado
```

### No Console do Backend:

**Sucesso:**
```
✅ MongoDB conectado
🚀 Servidor rodando na porta 5000
POST /api/auth/register 201
POST /api/auth/login 200
POST /api/orders 201
```

**Erros para investigar:**
```
❌ MongoDB connection error
⚠️ JWT malformed
❌ Stock insuficiente
```

---

## 🎯 Próximos Passos

Após todos os testes locais passarem:

1. **Deploy do Backend** (Railway/Heroku)
2. **Deploy do Frontend** (Vercel/Netlify)
3. **Atualizar `js/api.js`** com URL de produção
4. **Mudar para credenciais de PRODUÇÃO do Mercado Pago**
5. **Configurar Webhook em produção**
6. **Testar fluxo completo em produção**

---

**Boa sorte com os testes!** 🚀

Se encontrar algum erro, verifique:
1. Console do navegador (F12)
2. Console do backend
3. MongoDB Compass (ver dados)
4. Network tab (ver requisições)
