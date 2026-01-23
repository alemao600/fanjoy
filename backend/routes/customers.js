const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protectCustomer } = require('../middleware/auth');
const Customer = require('../models/Customer');

// @route   GET /api/customers/profile
// @desc    Obter perfil do cliente
// @access  Private (Customer)
router.get('/profile', protectCustomer, async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer._id)
      .populate('orders');

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar perfil'
    });
  }
});

// @route   PUT /api/customers/profile
// @desc    Atualizar perfil
// @access  Private (Customer)
router.put('/profile', protectCustomer, async (req, res) => {
  try {
    const { name, lastName, phone, cpf } = req.body;

    const customer = await Customer.findByIdAndUpdate(
      req.customer._id,
      { name, lastName, phone, cpf },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      data: customer
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar perfil'
    });
  }
});

// @route   POST /api/customers/addresses
// @desc    Adicionar endereço
// @access  Private (Customer)
router.post('/addresses', protectCustomer, async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer._id);
    
    customer.addresses.push(req.body);
    await customer.save();

    res.status(201).json({
      success: true,
      message: 'Endereço adicionado com sucesso',
      data: customer.addresses
    });
  } catch (error) {
    console.error('Erro ao adicionar endereço:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao adicionar endereço'
    });
  }
});

// @route   PUT /api/customers/addresses/:addressId
// @desc    Atualizar endereço
// @access  Private (Customer)
router.put('/addresses/:addressId', protectCustomer, async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer._id);
    const address = customer.addresses.id(req.params.addressId);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Endereço não encontrado'
      });
    }

    Object.assign(address, req.body);
    await customer.save();

    res.json({
      success: true,
      message: 'Endereço atualizado com sucesso',
      data: customer.addresses
    });
  } catch (error) {
    console.error('Erro ao atualizar endereço:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar endereço'
    });
  }
});

// @route   DELETE /api/customers/addresses/:addressId
// @desc    Deletar endereço
// @access  Private (Customer)
router.delete('/addresses/:addressId', protectCustomer, async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer._id);
    customer.addresses.pull(req.params.addressId);
    await customer.save();

    res.json({
      success: true,
      message: 'Endereço removido com sucesso',
      data: customer.addresses
    });
  } catch (error) {
    console.error('Erro ao deletar endereço:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar endereço'
    });
  }
});

module.exports = router;
