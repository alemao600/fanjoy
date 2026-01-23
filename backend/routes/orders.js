const express = require('express');
const router = express.Router();
const { protectCustomer } = require('../middleware/auth');
const Order = require('../models/Order');
const Product = require('../models/Product');

// @route   POST /api/orders
// @desc    Criar novo pedido
// @access  Private (Customer)
router.post('/', protectCustomer, async (req, res) => {
  try {
    const { items, shippingAddressId, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Carrinho vazio'
      });
    }

    // Buscar endereço
    const address = req.customer.addresses.id(shippingAddressId);
    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Endereço não encontrado'
      });
    }

    // Calcular totais e validar produtos
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      
      if (!product || !product.isActive) {
        return res.status(404).json({
          success: false,
          message: `Produto ${item.productId} não encontrado`
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Estoque insuficiente para ${product.name}`
        });
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: product.images[0]
      });
    }

    // Calcular frete
    const shipping = subtotal >= 200 ? 0 : 25;
    const total = subtotal + shipping;

    // Criar pedido
    const order = await Order.create({
      customer: req.customer._id,
      items: orderItems,
      subtotal,
      shipping,
      total,
      paymentMethod,
      shippingAddress: {
        label: address.label,
        cep: address.cep,
        street: address.street,
        number: address.number,
        complement: address.complement,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state
      }
    });

    // Atualizar estoque
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity, sales: item.quantity }
      });
    }

    // Adicionar pedido ao cliente
    req.customer.orders.push(order._id);
    await req.customer.save();

    res.status(201).json({
      success: true,
      message: 'Pedido criado com sucesso',
      data: order
    });
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar pedido'
    });
  }
});

// @route   GET /api/orders
// @desc    Listar pedidos do cliente
// @access  Private (Customer)
router.get('/', protectCustomer, async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.customer._id })
      .sort({ createdAt: -1 })
      .populate('items.product');

    res.json({
      success: true,
      count: orders.length,
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

// @route   GET /api/orders/:id
// @desc    Obter detalhes de um pedido
// @access  Private (Customer)
router.get('/:id', protectCustomer, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }

    // Verificar se pertence ao cliente
    if (order.customer.toString() !== req.customer._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar pedido'
    });
  }
});

module.exports = router;
