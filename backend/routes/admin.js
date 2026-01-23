const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/auth');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Customer = require('../models/Customer');

// @route   POST /api/admin/products
// @desc    Criar produto
// @access  Private (Admin)
router.post('/products', protectAdmin, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Produto criado com sucesso',
      data: product
    });
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar produto'
    });
  }
});

// @route   PUT /api/admin/products/:id
// @desc    Atualizar produto
// @access  Private (Admin)
router.put('/products/:id', protectAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Produto atualizado com sucesso',
      data: product
    });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar produto'
    });
  }
});

// @route   DELETE /api/admin/products/:id
// @desc    Deletar produto
// @access  Private (Admin)
router.delete('/products/:id', protectAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Produto deletado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar produto'
    });
  }
});

// @route   POST /api/admin/categories
// @desc    Criar categoria
// @access  Private (Admin)
router.post('/categories', protectAdmin, async (req, res) => {
  try {
    const category = await Category.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Categoria criada com sucesso',
      data: category
    });
  } catch (error) {
    console.error('Erro ao criar categoria:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar categoria'
    });
  }
});

// @route   GET /api/admin/orders
// @desc    Listar todos os pedidos
// @access  Private (Admin)
router.get('/orders', protectAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const filters = {};
    if (status) filters.status = status;

    const skip = (page - 1) * limit;

    const orders = await Order.find(filters)
      .populate('customer', 'name lastName email')
      .populate('items.product')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Order.countDocuments(filters);

    res.json({
      success: true,
      count: orders.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      data: orders
    });
  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar pedidos'
    });
  }
});

// @route   PUT /api/admin/orders/:id/status
// @desc    Atualizar status do pedido
// @access  Private (Admin)
router.put('/orders/:id/status', protectAdmin, async (req, res) => {
  try {
    const { status, trackingCode } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }

    order.status = status;
    if (trackingCode) order.trackingCode = trackingCode;
    
    await order.save();

    res.json({
      success: true,
      message: 'Status atualizado com sucesso',
      data: order
    });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar status'
    });
  }
});

// @route   GET /api/admin/dashboard
// @desc    Obter estatísticas do dashboard
// @access  Private (Admin)
router.get('/dashboard', protectAdmin, async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments({ isActive: true });
    const totalCustomers = await Customer.countDocuments({ isActive: true });
    const totalOrders = await Order.countDocuments();
    
    const revenue = await Order.aggregate([
      { $match: { paymentStatus: 'approved' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const recentOrders = await Order.find()
      .populate('customer', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        stats: {
          totalProducts,
          totalCustomers,
          totalOrders,
          totalRevenue: revenue[0]?.total || 0
        },
        recentOrders
      }
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar dashboard'
    });
  }
});

module.exports = router;
