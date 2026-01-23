const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');
const Admin = require('../models/Admin');

// Proteger rotas de clientes
exports.protectCustomer = async (req, res, next) => {
  try {
    let token;

    // Verificar token no header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Não autorizado. Token não fornecido.'
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificar se é cliente
    if (decoded.type !== 'customer') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Token inválido.'
      });
    }

    // Buscar cliente
    const customer = await Customer.findById(decoded.id);

    if (!customer || !customer.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Cliente não encontrado ou inativo.'
      });
    }

    req.customer = customer;
    next();
  } catch (error) {
    console.error('Erro de autenticação:', error);
    return res.status(401).json({
      success: false,
      message: 'Token inválido ou expirado.'
    });
  }
};

// Proteger rotas de admin
exports.protectAdmin = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Não autorizado. Token não fornecido.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Apenas administradores.'
      });
    }

    const admin = await Admin.findById(decoded.id);

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Administrador não encontrado ou inativo.'
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Erro de autenticação admin:', error);
    return res.status(401).json({
      success: false,
      message: 'Token inválido ou expirado.'
    });
  }
};

// Gerar token JWT
exports.generateToken = (id, type = 'customer') => {
  return jwt.sign(
    { id, type },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};
