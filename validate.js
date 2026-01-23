#!/usr/bin/env node

/**
 * Script de Validação - Fanjoy Lab
 * Verifica se todos os arquivos necessários existem e estão configurados
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  const fullPath = path.join(__dirname, filePath);
  if (fs.existsSync(fullPath)) {
    log(`✅ ${description}`, 'green');
    return true;
  } else {
    log(`❌ ${description} - NÃO ENCONTRADO: ${filePath}`, 'red');
    return false;
  }
}

function checkFileContent(filePath, searchString, description) {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) {
    log(`❌ ${description} - Arquivo não encontrado`, 'red');
    return false;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  if (content.includes(searchString)) {
    log(`✅ ${description}`, 'green');
    return true;
  } else {
    log(`⚠️  ${description} - NÃO CONFIGURADO`, 'yellow');
    return false;
  }
}

function checkEnvFile() {
  const envPath = path.join(__dirname, 'backend', '.env');
  const examplePath = path.join(__dirname, 'backend', '.env.example');

  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(examplePath)) {
      log('⚠️  Arquivo .env não encontrado. Copiando de .env.example...', 'yellow');
      fs.copyFileSync(examplePath, envPath);
      log('✅ Arquivo .env criado. CONFIGURE AS VARIÁVEIS!', 'cyan');
      return false;
    } else {
      log('❌ Arquivos .env e .env.example não encontrados', 'red');
      return false;
    }
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const required = [
    'MONGODB_URI',
    'JWT_SECRET',
    'MERCADOPAGO_ACCESS_TOKEN',
    'MERCADOPAGO_PUBLIC_KEY'
  ];

  let allConfigured = true;
  required.forEach(key => {
    const regex = new RegExp(`${key}=.+`);
    if (regex.test(content)) {
      log(`  ✅ ${key} configurado`, 'green');
    } else {
      log(`  ❌ ${key} NÃO configurado`, 'red');
      allConfigured = false;
    }
  });

  return allConfigured;
}

console.log('\n' + '='.repeat(60));
log('🔍 VALIDAÇÃO DO PROJETO FANJOY LAB', 'cyan');
console.log('='.repeat(60) + '\n');

let errors = 0;
let warnings = 0;

// ========================================
log('\n📁 VERIFICANDO ARQUIVOS HTML...', 'blue');
// ========================================

if (!checkFile('index.html', 'Página principal (index.html)')) errors++;
if (!checkFile('cart.html', 'Carrinho (cart.html)')) errors++;
if (!checkFile('customer-login.html', 'Login de clientes (customer-login.html)')) errors++;
if (!checkFile('customer-profile.html', 'Perfil de clientes (customer-profile.html)')) errors++;
if (!checkFile('admin.html', 'Painel admin (admin.html)')) errors++;
if (!checkFile('login.html', 'Login admin (login.html)')) errors++;

// ========================================
log('\n📜 VERIFICANDO SCRIPTS DE INTEGRAÇÃO...', 'blue');
// ========================================

if (!checkFile('js/api.js', 'API principal (js/api.js)')) errors++;
if (!checkFile('js/index-integration.js', 'Integração index (js/index-integration.js)')) errors++;
if (!checkFile('js/cart-integration.js', 'Integração carrinho (js/cart-integration.js)')) errors++;
if (!checkFile('js/login-integration.js', 'Integração login (js/login-integration.js)')) errors++;
if (!checkFile('js/profile-integration.js', 'Integração perfil (js/profile-integration.js)')) errors++;

// ========================================
log('\n🔌 VERIFICANDO INTEGRAÇÃO NOS HTMLs...', 'blue');
// ========================================

if (!checkFileContent('index.html', 'js/api.js', 'index.html carrega api.js')) warnings++;
if (!checkFileContent('index.html', 'js/index-integration.js', 'index.html carrega integração')) warnings++;
if (!checkFileContent('cart.html', 'js/cart-integration.js', 'cart.html carrega integração')) warnings++;
if (!checkFileContent('cart.html', 'mercadopago.com/js/v2', 'cart.html carrega SDK Mercado Pago')) warnings++;
if (!checkFileContent('customer-login.html', 'js/login-integration.js', 'login carrega integração')) warnings++;
if (!checkFileContent('customer-profile.html', 'js/profile-integration.js', 'perfil carrega integração')) warnings++;

// ========================================
log('\n🗄️  VERIFICANDO BACKEND...', 'blue');
// ========================================

if (!checkFile('backend/package.json', 'Backend package.json')) errors++;
if (!checkFile('backend/server.js', 'Backend server.js')) errors++;
if (!checkFile('backend/init-db.js', 'Script de inicialização do banco')) errors++;
if (!checkFile('backend/.env.example', 'Exemplo de .env')) warnings++;

log('\n🔐 VERIFICANDO CONFIGURAÇÕES DO BACKEND...', 'blue');
if (!checkEnvFile()) {
  errors++;
  log('⚠️  Configure o arquivo .env antes de rodar o backend!', 'yellow');
}

// ========================================
log('\n🗂️  VERIFICANDO MODELS...', 'blue');
// ========================================

if (!checkFile('backend/models/Customer.js', 'Model Customer')) errors++;
if (!checkFile('backend/models/Product.js', 'Model Product')) errors++;
if (!checkFile('backend/models/Order.js', 'Model Order')) errors++;
if (!checkFile('backend/models/Category.js', 'Model Category')) errors++;
if (!checkFile('backend/models/Admin.js', 'Model Admin')) errors++;

// ========================================
log('\n🛣️  VERIFICANDO ROUTES...', 'blue');
// ========================================

if (!checkFile('backend/routes/auth.js', 'Route Auth')) errors++;
if (!checkFile('backend/routes/products.js', 'Route Products')) errors++;
if (!checkFile('backend/routes/orders.js', 'Route Orders')) errors++;
if (!checkFile('backend/routes/customers.js', 'Route Customers')) errors++;
if (!checkFile('backend/routes/payments.js', 'Route Payments')) errors++;
if (!checkFile('backend/routes/categories.js', 'Route Categories')) errors++;
if (!checkFile('backend/routes/admin.js', 'Route Admin')) errors++;

// ========================================
log('\n🛡️  VERIFICANDO MIDDLEWARE...', 'blue');
// ========================================

if (!checkFile('backend/middleware/auth.js', 'Middleware de autenticação')) errors++;

// ========================================
log('\n📚 VERIFICANDO DOCUMENTAÇÃO...', 'blue');
// ========================================

if (!checkFile('README.md', 'README principal')) warnings++;
if (!checkFile('backend/README.md', 'README do backend')) warnings++;
if (!checkFile('GUIA-TESTES.md', 'Guia de testes')) warnings++;
if (!checkFile('COMO-COLOCAR-ONLINE.md', 'Guia de deploy')) warnings++;
if (!checkFile('GUIA-DEPLOY.md', 'Guia de deploy detalhado')) warnings++;

// ========================================
log('\n📦 VERIFICANDO NODE_MODULES (Backend)...', 'blue');
// ========================================

const nodeModulesPath = path.join(__dirname, 'backend', 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  log('✅ node_modules instalado', 'green');
} else {
  log('⚠️  node_modules NÃO instalado. Execute: cd backend && npm install', 'yellow');
  warnings++;
}

// ========================================
log('\n' + '='.repeat(60));
log('📊 RESULTADO DA VALIDAÇÃO', 'cyan');
console.log('='.repeat(60));
// ========================================

if (errors === 0 && warnings === 0) {
  log('\n✅ TUDO PERFEITO! Seu projeto está completo e pronto para uso!', 'green');
  log('\n📋 Próximos passos:', 'cyan');
  log('  1. Configure o arquivo backend/.env', 'cyan');
  log('  2. Execute: cd backend && npm install', 'cyan');
  log('  3. Execute: cd backend && node init-db.js', 'cyan');
  log('  4. Execute: cd backend && npm run dev', 'cyan');
  log('  5. Abra index.html no navegador', 'cyan');
  log('  6. Siga o GUIA-TESTES.md para testar tudo\n', 'cyan');
} else if (errors === 0) {
  log(`\n⚠️  Projeto OK, mas há ${warnings} avisos.`, 'yellow');
  log('Verifique os itens acima marcados com ⚠️\n', 'yellow');
} else {
  log(`\n❌ Encontrados ${errors} erros e ${warnings} avisos.`, 'red');
  log('Corrija os itens marcados com ❌ antes de continuar.\n', 'red');
  process.exit(1);
}

console.log('='.repeat(60) + '\n');
