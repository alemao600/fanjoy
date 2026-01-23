# 🛍️ Fanjoy Lab - Sistema de E-commerce

## 📋 Sistema de Login de Clientes Implementado

### ✨ Funcionalidades Criadas

#### 1. **Sistema de Autenticação de Clientes** (`customer-login.html`)
- ✅ Página de login e cadastro com abas
- ✅ Cadastro completo com nome, sobrenome, e-mail, telefone e senha
- ✅ Login com e-mail e senha
- ✅ Validação de formulários
- ✅ Máscaras para telefone
- ✅ Mensagens de erro e sucesso
- ✅ Redirecionamento automático após login
- ✅ Persistência de dados no localStorage

#### 2. **Perfil do Cliente** (`customer-profile.html`)
- ✅ Página completa de perfil com 3 abas principais:
  
  **Aba Meus Dados:**
  - Edição de informações pessoais (nome, sobrenome, e-mail, telefone)
  - Salvamento automático das alterações
  
  **Aba Endereços:**
  - Cadastro ilimitado de endereços
  - Formulário completo com CEP, rua, número, complemento, bairro, cidade e estado
  - Identificação de endereços (Casa, Trabalho, etc.)
  - Edição e exclusão de endereços
  - Máscara para CEP
  
  **Aba Histórico de Pedidos:**
  - Listagem completa de todos os pedidos
  - Visualização de status (Pendente, Confirmado, Enviado, Entregue, Cancelado)
  - Detalhes dos produtos em cada pedido
  - Data e valor total de cada pedido
  - Design com cards organizados

#### 3. **Carrinho de Compras** (`cart.html`)
- ✅ Página dedicada ao carrinho
- ✅ Adicionar/remover produtos
- ✅ Controle de quantidade (+/-)
- ✅ Cálculo automático de subtotal
- ✅ Cálculo de frete (R$ 25 ou grátis acima de R$ 200)
- ✅ Indicador de quanto falta para frete grátis
- ✅ Resumo do pedido
- ✅ Botão de finalizar compra
- ✅ Validação de login antes de finalizar
- ✅ Validação de endereço cadastrado
- ✅ Criação automática de pedido no histórico

#### 4. **Integração com Index.html**
- ✅ Botão de Login dinâmico (mostra nome do usuário quando logado)
- ✅ Ícone de carrinho com contador de itens
- ✅ Botões "Comprar" funcionais em todos os produtos
- ✅ Feedback visual ao adicionar produto ao carrinho
- ✅ Navegação suave entre páginas
- ✅ Botões "Explorar produtos" e "Ver coleções" funcionais

---

## 🚀 Como Usar

### Para Clientes:

1. **Criar Conta:**
   - Acesse `customer-login.html` ou clique em "Login" no site
   - Clique na aba "Cadastrar"
   - Preencha todos os campos
   - Clique em "Criar Conta"

2. **Fazer Login:**
   - Na página de login, use seu e-mail e senha
   - Clique em "Entrar"

3. **Gerenciar Perfil:**
   - Após login, clique no seu nome no topo
   - Edite suas informações na aba "Meus Dados"
   - Adicione endereços na aba "Endereços"
   - Visualize seus pedidos na aba "Histórico de Pedidos"

4. **Fazer Compras:**
   - Navegue pelos produtos na página inicial
   - Clique em "Comprar" para adicionar ao carrinho
   - Clique no ícone do carrinho para ver seus itens
   - Ajuste quantidades se necessário
   - Clique em "Finalizar Compra"
   - O pedido será criado e aparecerá no seu histórico

### Para Administradores:

1. **Login Admin:**
   - Acesse `login.html` ou clique no cadeado 🔒 no rodapé
   - Usuário: `admin`
   - Senha: `admin123`

2. **Gerenciar Produtos:**
   - Adicione, edite ou exclua produtos
   - Adicione múltiplas imagens por produto
   - Defina categorias, tags e preços

3. **Gerenciar Categorias:**
   - Crie novas categorias
   - Organize seus produtos

---

## 🗂️ Estrutura de Dados

### Cliente (localStorage: `fanjoy_customers`)
```javascript
{
  id: timestamp,
  name: "João",
  lastName: "Silva",
  fullName: "João Silva",
  email: "joao@email.com",
  phone: "(11) 99999-9999",
  password: "senha123",
  addresses: [
    {
      id: timestamp,
      label: "Casa",
      cep: "12345-678",
      street: "Rua Exemplo",
      number: "123",
      complement: "Apt 45",
      neighborhood: "Centro",
      city: "São Paulo",
      state: "SP"
    }
  ],
  orders: [
    {
      id: timestamp,
      date: "2026-01-22T...",
      items: [...],
      subtotal: 149.00,
      shipping: 25.00,
      total: 174.00,
      status: "pending",
      address: {...}
    }
  ],
  createdAt: "2026-01-22T..."
}
```

### Carrinho (localStorage: `fanjoy_cart`)
```javascript
[
  {
    id: 1,
    name: "Produto",
    price: 149.00,
    image: "url",
    quantity: 2
  }
]
```

### Sessão (sessionStorage)
- `fanjoy_customer_logged`: "true" ou null
- `fanjoy_customer_id`: ID do cliente
- `fanjoy_customer_name`: Nome do cliente
- `fanjoy_checkout_redirect`: Flag para redirecionar após login

---

## 🎨 Design e UX

- **Design Moderno:** Gradientes, glassmorphism e animações suaves
- **Responsivo:** Funciona em desktop, tablet e mobile
- **Feedback Visual:** Mensagens de sucesso/erro, animações nos botões
- **Navegação Intuitiva:** Abas, modais e transições suaves
- **Status Coloridos:** Pedidos com cores distintas por status

---

## 🔐 Segurança

⚠️ **IMPORTANTE:** Este é um protótipo educacional. Para produção:
- Implemente autenticação backend real
- Use hash de senhas (bcrypt, argon2)
- Implemente tokens JWT
- Adicione HTTPS
- Valide dados no servidor
- Implemente rate limiting
- Use ambiente seguro para credenciais

---

## 📱 Páginas do Sistema

1. **index.html** - Loja principal
2. **customer-login.html** - Login/Cadastro de clientes
3. **customer-profile.html** - Perfil e gerenciamento de conta
4. **cart.html** - Carrinho de compras
5. **admin.html** - Painel administrativo
6. **login.html** - Login de administradores

---

## ✅ Checklist de Funcionalidades

- [x] Cadastro de clientes
- [x] Login de clientes
- [x] Perfil de cliente
- [x] Gerenciamento de endereços
- [x] Histórico de pedidos
- [x] Carrinho de compras
- [x] Adicionar produtos ao carrinho
- [x] Finalizar compra
- [x] Sistema de frete
- [x] Validações de formulário
- [x] Feedback visual
- [x] Design responsivo
- [x] Persistência de dados
- [x] Integração completa

---

## 🎯 Próximas Melhorias Sugeridas

- [ ] Sistema de pagamento (integração com gateway)
- [ ] Rastreamento de pedidos
- [ ] E-mails de confirmação
- [ ] Sistema de cupons de desconto
- [ ] Avaliações e reviews de produtos
- [ ] Wishlist (lista de desejos)
- [ ] Recuperação de senha
- [ ] Notificações push
- [ ] Chat de suporte

---

**Desenvolvido com ❤️ para Fanjoy Lab**
