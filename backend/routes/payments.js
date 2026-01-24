const express = require('express');
const router = express.Router();
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const { protectCustomer } = require('../middleware/auth');
const Order = require('../models/Order');

// Configurar Mercado Pago (SDK v2.x)
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  options: { timeout: 20000 }
});

// @route   POST /api/payments/create-preference
// @desc    Criar preferência de pagamento no Mercado Pago
// @access  Private (Customer)
router.post('/create-preference', protectCustomer, async (req, res) => {
  try {
    const { orderId } = req.body;

    // Buscar pedido
    const order = await Order.findById(orderId).populate('items.product');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }

    // Verificar se o pedido pertence ao cliente
    if (order.customer.toString() !== req.customer._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    // Criar itens para o Mercado Pago
    const items = order.items.map(item => ({
      id: item.product._id.toString(),
      title: item.name,
      description: `Produto da Fanjoy Lab`,
      picture_url: item.image,
      category_id: 'fashion',
      quantity: item.quantity,
      currency_id: 'BRL',
      unit_price: item.price
    }));

    // Adicionar frete como item se houver
    if (order.shipping > 0) {
      items.push({
        id: 'shipping',
        title: 'Frete',
        description: 'Custo de envio',
        quantity: 1,
        currency_id: 'BRL',
        unit_price: order.shipping
      });
    }

    // Criar preferência de pagamento
    const preferenceRequest = {
      items: items,
      payer: {
        name: req.customer.name,
        surname: req.customer.lastName || '',
        email: req.customer.email,
        phone: {
          number: req.customer.phone ? req.customer.phone.replace(/\D/g, '') : '1199999999'
        },
        address: {
          zip_code: order.shippingAddress.cep.replace(/\D/g, ''),
          street_name: order.shippingAddress.street,
          street_number: order.shippingAddress.number
        }
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL}/payment-success`,
        failure: `${process.env.FRONTEND_URL}/payment-failure`,
        pending: `${process.env.FRONTEND_URL}/payment-pending`
      },
      auto_return: 'approved',
      external_reference: orderId,
      notification_url: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/payments/webhook`,
      statement_descriptor: 'FANJOY LAB',
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 12 // Até 12x
      }
    };

    const preference = new Preference(client);
    const response = await preference.create({ body: preferenceRequest });

    res.json({
      success: true,
      data: {
        preferenceId: response.id,
        initPoint: response.init_point,
        sandboxInitPoint: response.sandbox_init_point
      }
    });
  } catch (error) {
    console.error('Erro ao criar preferência de pagamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar pagamento',
      error: error.message
    });
  }
});

// @route   POST /api/payments/webhook
// @desc    Webhook do Mercado Pago
// @access  Public (Mercado Pago)
router.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;

    // Verificar tipo de notificação
    if (type === 'payment') {
      const paymentId = data.id;

      // Buscar informações do pagamento
      const payment = new Payment(client);
      const paymentResponse = await payment.get({ id: paymentId });
      const orderId = paymentResponse.external_reference;
      const status = paymentResponse.status;

      // Atualizar pedido
      const order = await Order.findById(orderId);

      if (order) {
        order.paymentId = paymentId;

        // Mapear status do Mercado Pago para nosso sistema
        switch (status) {
          case 'approved':
            order.paymentStatus = 'approved';
            order.status = 'confirmed';
            break;
          case 'rejected':
          case 'cancelled':
            order.paymentStatus = 'rejected';
            order.status = 'cancelled';
            break;
          case 'in_process':
          case 'pending':
            order.paymentStatus = 'pending';
            break;
          case 'refunded':
            order.paymentStatus = 'refunded';
            order.status = 'cancelled';
            break;
        }

        await order.save();

        console.log(`✅ Pedido ${orderId} atualizado - Status: ${order.paymentStatus}`);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).send('Error');
  }
});

// @route   GET /api/payments/status/:orderId
// @desc    Verificar status de pagamento
// @access  Private (Customer)
router.get('/status/:orderId', protectCustomer, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }

    if (order.customer.toString() !== req.customer._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    res.json({
      success: true,
      data: {
        paymentStatus: order.paymentStatus,
        orderStatus: order.status,
        paymentId: order.paymentId
      }
    });
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar status'
    });
  }
});

// Alternativa: Integração com Stripe
// Descomente para usar Stripe ao invés de Mercado Pago
/*
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

router.post('/create-payment-intent', protectCustomer, async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.total * 100), // Stripe usa centavos
      currency: 'brl',
      metadata: { orderId: orderId }
    });

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
*/

module.exports = router;
