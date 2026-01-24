const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// CORS Configuration - Deve ser PRIMEIRO middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8000',
  'https://fanjoy-orcin.vercel.app',
  process.env.FRONTEND_URL || 'http://localhost:3000'
];

// CORS ANTES de tudo
app.use(cors({
  origin: true, // Permitir qualquer origem temporariamente para debug
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));

// Preflight requests
app.options('*', cors());

// Security Middleware (DEPOIS do CORS)
app.use(helmet());

// Rate limiting (DEPOIS do CORS)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // limite de 100 requisições por IP
});
app.use('/api/', limiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Database Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB conectado com sucesso'))
.catch(err => {
  console.error('❌ Erro ao conectar MongoDB:', err);
  process.exit(1);
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// Initialize Database (Endpoint seguro com senha)
app.post('/api/init-db', async (req, res) => {
  try {
    const { password } = req.body;
    
    // Senha de segurança
    if (password !== 'admin123456') {
      return res.status(401).json({ success: false, message: 'Senha incorreta' });
    }

    const Admin = require('./models/Admin');
    const Customer = require('./models/Customer');
    const Product = require('./models/Product');
    const Category = require('./models/Category');

    // Limpar dados existentes
    await Admin.deleteMany({});
    await Customer.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
    console.log('🗑️  Dados antigos removidos');

    // Criar categorias
    const categories = await Category.create([
      { name: 'Camiseta', description: 'Camisetas premium de K-pop e doramas' },
      { name: 'Caneca', description: 'Canecas personalizadas' },
      { name: 'Photocard', description: 'Photocards exclusivas' },
      { name: 'Moletom', description: 'Moletons confortáveis' },
      { name: 'Acessório', description: 'Acessórios diversos' }
    ]);

    // Criar admin
    await Admin.create({
      username: 'admin',
      email: 'admin@fanjoy.com',
      password: 'Admin@123456',
      role: 'super_admin'
    });

    // Criar produtos (incluindo teste de R$ 2)
    await Product.create([
      {
        name: '🧪 Teste R$ 2 (Clique aqui)',
        description: 'Produto de teste para checkout - Clique em Comprar para testar o Mercado Pago',
        price: 2,
        images: ['https://images.unsplash.com/photo-1516321318423-f06f70504504?auto=format&fit=crop&w=600&q=80'],
        categories: [categories[0]._id],
        tag: 'TESTE',
        buttonText: 'Comprar',
        stock: 1000
      },
      {
        name: 'Camiseta Oversize',
        description: 'Algodão premium 280g, print neon high quality',
        price: 149,
        images: ['https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=600&q=80'],
        categories: [categories[0]._id],
        tag: 'Novo',
        buttonText: 'Comprar',
        stock: 50
      },
      {
        name: 'Caneca Holográfica',
        description: 'Acabamento holo, interior colorido + brinde',
        price: 69,
        images: ['https://images.unsplash.com/photo-1523365280197-f21d6cfc1c67?auto=format&fit=crop&w=600&q=80'],
        categories: [categories[1]._id],
        tag: 'Hot',
        buttonText: 'Comprar',
        stock: 100
      }
    ]);

    // Criar cliente de teste
    await Customer.create({
      name: 'João',
      lastName: 'Silva',
      email: 'cliente@teste.com',
      password: 'teste123',
      phone: '(11) 98765-4321'
    });

    res.json({
      success: true,
      message: '✅ Banco de dados inicializado com sucesso!',
      data: {
        categoriesCreated: 5,
        productsCreated: 3,
        adminCreated: true,
        customerCreated: true
      }
    });
  } catch (error) {
    console.error('Erro ao inicializar:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Rota não encontrada' 
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Erro:', err);
  
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 API disponível em: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM recebido. Encerrando servidor...');
  mongoose.connection.close();
  process.exit(0);
});
