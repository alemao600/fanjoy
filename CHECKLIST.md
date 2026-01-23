# ✅ CHECKLIST COMPLETO - Fanjoy Lab

## 🎯 FASE 1: Setup Inicial

### Backend
- [ ] Pasta `backend/` criada
- [ ] Arquivo `package.json` existe
- [ ] Arquivo `.env.example` existe
- [ ] Arquivo `.env` criado (copiar de `.env.example`)
- [ ] Variáveis configuradas no `.env`:
  - [ ] `MONGODB_URI` (MongoDB Atlas ou local)
  - [ ] `JWT_SECRET` (texto longo aleatório)
  - [ ] `MERCADOPAGO_ACCESS_TOKEN` (do painel MP)
  - [ ] `MERCADOPAGO_PUBLIC_KEY` (do painel MP)
  - [ ] `FRONTEND_URL` (URL do frontend)
- [ ] Dependências instaladas: `npm install`
- [ ] MongoDB conectado (Atlas ou local)

### Frontend
- [ ] Arquivos HTML existem:
  - [ ] `index.html`
  - [ ] `cart.html`
  - [ ] `customer-login.html`
  - [ ] `customer-profile.html`
  - [ ] `admin.html`
  - [ ] `login.html`
- [ ] Pasta `js/` existe
- [ ] Scripts de integração criados:
  - [ ] `js/api.js`
  - [ ] `js/index-integration.js`
  - [ ] `js/cart-integration.js`
  - [ ] `js/login-integration.js`
  - [ ] `js/profile-integration.js`
- [ ] `js/api.js` configurado:
  - [ ] `baseURL` aponta para backend correto
  - [ ] `MERCADOPAGO_PUBLIC_KEY` configurada

### Documentação
- [ ] `README.md` (principal)
- [ ] `backend/README.md`
- [ ] `GUIA-TESTES.md`
- [ ] `COMO-COLOCAR-ONLINE.md`
- [ ] `GUIA-DEPLOY.md`

---

## 🎯 FASE 2: Teste Local

### 2.1 Backend
- [ ] Backend iniciado: `cd backend && npm run dev`
- [ ] Console mostra: "✅ MongoDB conectado"
- [ ] Console mostra: "🚀 Servidor rodando na porta 5000"
- [ ] Endpoint de health funciona: `curl http://localhost:5000/api/health`
- [ ] Banco inicializado: `node init-db.js`
- [ ] Console mostra credenciais de admin e cliente de teste
- [ ] MongoDB Compass mostra os dados (opcional)

### 2.2 Frontend - index.html
- [ ] Página abre sem erros no console
- [ ] Produtos carregam da API
- [ ] Console mostra: "✅ Fanjoy API configurada"
- [ ] Filtro de busca funciona
- [ ] Filtro de categorias funciona
- [ ] Filtro de preço funciona
- [ ] Botão "Adicionar ao Carrinho" funciona
- [ ] Mensagem "✓ Adicionado" aparece
- [ ] Contador do carrinho atualiza
- [ ] Botão "Login" aparece (se não logado)

### 2.3 Frontend - customer-login.html
- [ ] Página abre sem erros
- [ ] Aba "Criar Conta" funciona
- [ ] Validações funcionam:
  - [ ] Email inválido é rejeitado
  - [ ] Senhas diferentes são rejeitadas
  - [ ] Campos vazios são rejeitados
- [ ] Registro cria conta com sucesso
- [ ] Console mostra: `POST /api/auth/register 201`
- [ ] Mensagem de sucesso verde aparece
- [ ] Troca para aba de login após 2s
- [ ] Login funciona com credenciais criadas
- [ ] Console mostra: `POST /api/auth/login 200`
- [ ] Redireciona para `customer-profile.html`

### 2.4 Frontend - customer-profile.html
- [ ] Página abre sem erros
- [ ] Dados pessoais carregam
- [ ] Console mostra: `GET /api/customers/profile 200`
- [ ] **ABA Dados Pessoais:**
  - [ ] Campos são editáveis
  - [ ] Máscara de telefone funciona
  - [ ] Máscara de CPF funciona
  - [ ] Botão "Salvar" atualiza dados
  - [ ] Mensagem de sucesso aparece
- [ ] **ABA Endereços:**
  - [ ] Botão "Novo Endereço" abre modal
  - [ ] Máscara de CEP funciona
  - [ ] Salvar cria endereço
  - [ ] Endereço aparece na lista
  - [ ] Badge "Padrão" aparece corretamente
  - [ ] Botão "Editar" funciona
  - [ ] Botão "Excluir" funciona (com confirmação)
  - [ ] Botão "Tornar Padrão" funciona
- [ ] **ABA Pedidos:**
  - [ ] Mostra "Nenhum pedido" inicialmente
  - [ ] (Após compra) Pedidos aparecem aqui

### 2.5 Frontend - cart.html
- [ ] Carrinho carrega produtos adicionados
- [ ] Imagens dos produtos aparecem
- [ ] Botões + e - funcionam
- [ ] Quantidade atualiza corretamente
- [ ] Botão "Remover" funciona
- [ ] Subtotal calcula corretamente
- [ ] Frete calcula corretamente:
  - [ ] R$ 15,00 se subtotal < R$ 200
  - [ ] "GRÁTIS" se subtotal >= R$ 200
- [ ] Total calcula corretamente (subtotal + frete)
- [ ] Se carrinho vazio, mostra mensagem

### 2.6 Checkout (SEM Mercado Pago ainda)
- [ ] Botão "Finalizar Compra" presente
- [ ] Se não logado, pede para fazer login
- [ ] Se logado mas sem endereço, pede para cadastrar
- [ ] Console mostra: `POST /api/orders 201` (ao criar pedido)
- [ ] Pedido aparece em "Meus Pedidos"

### 2.7 Mercado Pago (Teste)
- [ ] SDK carregado: verificar `<script src="https://sdk.mercadopago.com/js/v2"></script>`
- [ ] Console mostra: "✅ Mercado Pago inicializado"
- [ ] Ao finalizar compra, console mostra: `POST /api/payments/create-preference 200`
- [ ] Redireciona para página do Mercado Pago
- [ ] Página do MP mostra produtos corretos
- [ ] Valor total está correto
- [ ] Teste com cartão de teste:
  - [ ] Número: 5031 4332 1540 6351
  - [ ] CVV: 123
  - [ ] Validade: 11/25
  - [ ] Nome: APRO
- [ ] Pagamento é aprovado
- [ ] (Verificar no backend) Webhook recebido
- [ ] Status do pedido atualizado

---

## 🎯 FASE 3: Validação Completa

### 3.1 Fluxo Completo (Como Cliente)
- [ ] 1. Abrir `index.html`
- [ ] 2. Navegar pelos produtos
- [ ] 3. Usar filtros
- [ ] 4. Adicionar 3 produtos ao carrinho
- [ ] 5. Ir para carrinho
- [ ] 6. Ajustar quantidades
- [ ] 7. Clicar em "Finalizar Compra"
- [ ] 8. Criar conta nova
- [ ] 9. Adicionar endereço
- [ ] 10. Voltar ao carrinho
- [ ] 11. Finalizar compra novamente
- [ ] 12. Fazer pagamento de teste
- [ ] 13. Verificar pedido em "Meus Pedidos"
- [ ] 14. Fazer logout
- [ ] 15. Fazer login novamente
- [ ] 16. Verificar que dados persistem

### 3.2 Segurança
- [ ] Tentar acessar `/customer-profile.html` sem login → Redireciona
- [ ] Fazer logout → localStorage e sessionStorage limpam
- [ ] Token inválido → Redireciona para login
- [ ] Senhas não aparecem no console
- [ ] Senhas não aparecem na resposta da API

### 3.3 Responsividade (Opcional)
- [ ] Mobile (375px): Layout funciona
- [ ] Tablet (768px): Layout funciona
- [ ] Desktop (1920px): Layout funciona

---

## 🎯 FASE 4: Deploy

### 4.1 Backend (Railway/Heroku)
- [ ] Conta criada no Railway ou Heroku
- [ ] CLI instalado
- [ ] Backend em repositório Git
- [ ] Deploy realizado
- [ ] Variáveis de ambiente configuradas:
  - [ ] `MONGODB_URI`
  - [ ] `JWT_SECRET`
  - [ ] `MERCADOPAGO_ACCESS_TOKEN`
  - [ ] `MERCADOPAGO_PUBLIC_KEY`
  - [ ] `FRONTEND_URL`
  - [ ] `NODE_ENV=production`
- [ ] URL do backend obtida (ex: `https://fanjoy-api.railway.app`)
- [ ] Endpoint de health funciona: `curl https://sua-api.com/api/health`
- [ ] Banco de dados inicializado em produção: `railway run node init-db.js`

### 4.2 MongoDB Atlas
- [ ] Conta criada
- [ ] Cluster criado (free tier)
- [ ] Usuário do banco criado
- [ ] IP liberado: 0.0.0.0/0
- [ ] String de conexão copiada
- [ ] String configurada no backend
- [ ] Conexão testada

### 4.3 Mercado Pago (Produção)
- [ ] Conta verificada
- [ ] Modo "Produção" ativado
- [ ] Credenciais de PRODUÇÃO obtidas:
  - [ ] Access Token
  - [ ] Public Key
- [ ] Credenciais configuradas no backend (.env)
- [ ] Credenciais configuradas no frontend (js/api.js)
- [ ] Webhook configurado no painel MP:
  - [ ] URL: `https://sua-api.com/api/payments/webhook`
  - [ ] Evento: "payments"
- [ ] Webhook testado

### 4.4 Frontend (Vercel/Netlify)
- [ ] Conta criada
- [ ] CLI instalado
- [ ] `js/api.js` atualizado com URL de produção do backend
- [ ] `MERCADOPAGO_PUBLIC_KEY` de produção configurada
- [ ] Deploy realizado
- [ ] URL do frontend obtida (ex: `https://fanjoy-lab.vercel.app`)
- [ ] URL configurada no CORS do backend

### 4.5 Teste em Produção
- [ ] Abrir site em produção
- [ ] Criar conta REAL
- [ ] Adicionar produtos
- [ ] Cadastrar endereço REAL
- [ ] Finalizar compra
- [ ] Fazer pagamento REAL com seu cartão (pequeno valor)
- [ ] Verificar se pedido foi criado
- [ ] Verificar se webhook foi recebido
- [ ] Verificar se status atualizou
- [ ] Testar em celular

---

## 🎯 FASE 5: Finalização

### 5.1 Documentação
- [ ] README.md atualizado com URLs de produção
- [ ] Credenciais de teste documentadas
- [ ] Instruções de deploy atualizadas

### 5.2 SEO e Performance (Opcional)
- [ ] Meta tags configuradas
- [ ] Open Graph configuradas
- [ ] Favicon adicionado
- [ ] Imagens otimizadas
- [ ] Google Analytics adicionado (opcional)

### 5.3 Backup
- [ ] Código em repositório Git
- [ ] `.env` salvo em local seguro (NÃO no Git!)
- [ ] Backup do banco de dados criado

### 5.4 Monitoramento
- [ ] Logs do Railway/Heroku funcionando
- [ ] Alertas de erro configurados (opcional)
- [ ] Uptime monitor configurado (opcional)

---

## 🎉 PROJETO COMPLETO!

Se você marcou TODOS os itens acima:

✅ **Seu e-commerce está 100% funcional e online!**

### Funcionalidades Implementadas:
- ✅ Catálogo de produtos com filtros
- ✅ Carrinho de compras
- ✅ Sistema de autenticação
- ✅ Perfil de cliente
- ✅ Gerenciamento de endereços
- ✅ Criação de pedidos
- ✅ Integração com Mercado Pago
- ✅ Histórico de compras
- ✅ Painel administrativo
- ✅ Backend REST API
- ✅ Banco de dados MongoDB
- ✅ Segurança JWT
- ✅ Deploy em produção

### Próximos Passos (Opcional):
- [ ] Adicionar mais produtos
- [ ] Criar campanhas de marketing
- [ ] Adicionar sistema de cupons de desconto
- [ ] Implementar busca avançada
- [ ] Adicionar wishlist
- [ ] Sistema de avaliações
- [ ] Email marketing
- [ ] Chat de suporte
- [ ] Blog integrado

---

## 📊 Status Geral

**Total de Itens:** ~150
**Concluídos:** _____ / 150
**Progresso:** _____ %

**Última Atualização:** ___/___/______

---

**Boa sorte com seu e-commerce!** 🚀🛍️
