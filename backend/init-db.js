const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const Customer = require('./models/Customer');
const Product = require('./models/Product');
const Category = require('./models/Category');
require('dotenv').config();

async function initDatabase() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB conectado');

    // Limpar dados existentes (cuidado em produção!)
    if (process.env.NODE_ENV === 'development') {
      await Admin.deleteMany({});
      await Customer.deleteMany({});
      await Product.deleteMany({});
      await Category.deleteMany({});
      console.log('🗑️  Dados antigos removidos');
    }

    // Criar admin padrão
    const admin = await Admin.create({
      username: 'admin',
      email: process.env.ADMIN_EMAIL || 'admin@fanjoy.com',
      password: process.env.ADMIN_PASSWORD || 'Admin@123456',
      role: 'super_admin'
    });
    console.log('👤 Admin criado:', admin.username);

    // Criar categorias
    const categories = await Category.create([
      { name: 'Camiseta', description: 'Camisetas premium de K-pop e doramas' },
      { name: 'Caneca', description: 'Canecas personalizadas' },
      { name: 'Photocard', description: 'Photocards exclusivas' },
      { name: 'Moletom', description: 'Moletons confortáveis' },
      { name: 'Acessório', description: 'Acessórios diversos' }
    ]);
    console.log(`📦 ${categories.length} categorias criadas`);

    // Criar produtos de exemplo
    const products = await Product.create([
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
      },
      {
        name: 'Photocard Set',
        description: 'Papel 400g, laminação premium + QR code',
        price: 79,
        images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80'],
        categories: [categories[2]._id],
        tag: 'Exclusivo',
        buttonText: 'Comprar',
        stock: 200
      },
      {
        name: 'Moletom Stage',
        description: 'Oversized, patches refletivos, termocrômico',
        price: 249,
        images: ['https://images.unsplash.com/photo-1542293787938-4d273c3608b8?auto=format&fit=crop&w=600&q=80'],
        categories: [categories[3]._id],
        tag: 'Trending',
        buttonText: 'Comprar',
        stock: 30
      },
      {
        name: 'Lightstick Custom',
        description: 'Base acrílica, LED RGB, bateria recarregável',
        price: 289,
        images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80'],
        categories: [categories[4]._id],
        tag: 'Limited',
        buttonText: 'Comprar',
        stock: 20
      },
      {
        name: 'Camiseta Personalizada',
        description: 'Escolha grupo, cor e nome. Print UV resistente',
        price: 179,
        images: ['https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=600&q=80'],
        categories: [categories[0]._id],
        tag: 'Customiza',
        buttonText: 'Personalizar',
        stock: 75
      }
    ]);
    console.log(`🎁 ${products.length} produtos criados`);

    // Criar cliente de teste
    const customer = await Customer.create({
      name: 'João',
      lastName: 'Silva',
      email: 'cliente@teste.com',
      password: 'teste123',
      phone: '(11) 98765-4321',
      addresses: [
        {
          label: 'Casa',
          cep: '01234-567',
          street: 'Rua das Flores',
          number: '123',
          complement: 'Apt 45',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          isDefault: true
        }
      ]
    });
    console.log('👤 Cliente de teste criado:', customer.email);

    console.log('\n✅ Banco de dados inicializado com sucesso!');
    console.log('\n📝 Credenciais:');
    console.log('Admin:');
    console.log('  Email:', admin.email);
    console.log('  Senha: Admin@123456');
    console.log('\nCliente:');
    console.log('  Email:', customer.email);
    console.log('  Senha: teste123');

  } catch (error) {
    console.error('❌ Erro ao inicializar banco:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Conexão fechada');
  }
}

// Executar
initDatabase();
