const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Customer = require('../models/Customer');
const Admin = require('../models/Admin');
const { generateToken } = require('../middleware/auth');

// Validações
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Nome é obrigatório'),
  body('lastName').trim().notEmpty().withMessage('Sobrenome é obrigatório'),
  body('email').isEmail().normalizeEmail().withMessage('E-mail inválido'),
  body('password').isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres'),
  body('phone').trim().notEmpty().withMessage('Telefone é obrigatório')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('E-mail inválido'),
  body('password').notEmpty().withMessage('Senha é obrigatória')
];

// @route   POST /api/auth/register
// @desc    Registrar novo cliente
// @access  Public
router.post('/register', registerValidation, async (req, res) => {
  try {
    // Validar
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { name, lastName, email, password, phone } = req.body;

    // Verificar se email já existe
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'Este e-mail já está cadastrado'
      });
    }

    // Criar cliente
    const customer = await Customer.create({
      name,
      lastName,
      email,
      password,
      phone
    });

    // Gerar token
    const token = generateToken(customer._id, 'customer');

    res.status(201).json({
      success: true,
      message: 'Cadastro realizado com sucesso',
      data: {
        customer: {
          id: customer._id,
          name: customer.name,
          lastName: customer.lastName,
          fullName: customer.fullName,
          email: customer.email,
          phone: customer.phone
        },
        token
      }
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao realizar cadastro'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login de cliente
// @access  Public
router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { email, password } = req.body;

    // Buscar cliente com senha
    const customer = await Customer.findOne({ email }).select('+password');

    if (!customer || !customer.isActive) {
      return res.status(401).json({
        success: false,
        message: 'E-mail ou senha incorretos'
      });
    }

    // Verificar senha
    const isMatch = await customer.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'E-mail ou senha incorretos'
      });
    }

    // Gerar token
    const token = generateToken(customer._id, 'customer');

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        customer: {
          id: customer._id,
          name: customer.name,
          lastName: customer.lastName,
          fullName: customer.fullName,
          email: customer.email,
          phone: customer.phone
        },
        token
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao realizar login'
    });
  }
});

// @route   POST /api/auth/admin/login
// @desc    Login de administrador
// @access  Public
router.post('/admin/login', loginValidation, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar admin com senha
    const admin = await Admin.findOne({ email }).select('+password');

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    // Atualizar último login
    admin.lastLogin = new Date();
    await admin.save();

    const token = generateToken(admin._id, 'admin');

    res.json({
      success: true,
      message: 'Login administrativo realizado com sucesso',
      data: {
        admin: {
          id: admin._id,
          username: admin.username,
          email: admin.email,
          role: admin.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Erro no login admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao realizar login'
    });
  }
});

module.exports = router;
