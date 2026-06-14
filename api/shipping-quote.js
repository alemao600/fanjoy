module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const token = process.env.MELHOR_ENVIO_TOKEN;
    const fromCep = String(process.env.STORE_FROM_CEP || '').replace(/\D/g, '');
    const baseUrl = process.env.MELHOR_ENVIO_BASE_URL || 'https://www.melhorenvio.com.br';
    const userAgent = process.env.MELHOR_ENVIO_USER_AGENT || 'Fanjoy (suporte@fanjoy.com)';

    if (!token) {
      return res.status(500).json({ success: false, message: 'MELHOR_ENVIO_TOKEN não configurado na Vercel' });
    }

    if (fromCep.length !== 8) {
      return res.status(500).json({ success: false, message: 'STORE_FROM_CEP não configurado corretamente' });
    }

    const toPostalCode = String(req.body?.to?.postal_code || '').replace(/\D/g, '');
    const products = Array.isArray(req.body?.products) ? req.body.products : [];

    if (toPostalCode.length !== 8) {
      return res.status(400).json({ success: false, message: 'CEP de destino inválido' });
    }

    if (!products.length || products.length > 20) {
      return res.status(400).json({ success: false, message: 'Produtos inválidos para cálculo' });
    }

    const payload = {
      from: { postal_code: fromCep },
      to: { postal_code: toPostalCode },
      products: products.map((p) => {
        const quantity = Math.min(50, Math.max(1, Number(p.quantity || 1)));
        return {
          id: String(p.id || 'item').slice(0, 80),
          width: Math.min(100, Math.max(1, Number(p.width || 25))),
          height: Math.min(100, Math.max(1, Number(p.height || 3))),
          length: Math.min(100, Math.max(1, Number(p.length || 30))),
          weight: Math.min(30, Math.max(0.01, Number(p.weight || 0.3))),
          insurance_value: Math.min(10000, Math.max(0, Number(p.insurance_value || 0))),
          quantity
        };
      })
    };

    const response = await fetch(`${baseUrl}/api/v2/me/shipment/calculate`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'User-Agent': userAgent
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        success: false,
        message: data?.message || 'Erro ao calcular frete no Melhor Envio',
        details: data
      });
    }

    const options = (Array.isArray(data) ? data : [])
      .filter((item) => !item.error)
      .map((item) => {
        const basePrice = Number(item.price || 0);
        const customPrice = Number(item.custom_price || 0);
        const validPrices = [basePrice, customPrice].filter((v) => Number.isFinite(v) && v > 0);
        const effectivePrice = validPrices.length ? Math.min(...validPrices) : 0;

        return {
          id: item.id,
          name: item.name || item.company?.name || 'Frete',
          // Usa sempre o menor preço retornado na cotação para bater com o “mais barato”.
          price: effectivePrice,
          delivery_time: item.custom_delivery_time || item.delivery_time || null,
          company: item.company?.name || null
        };
      })
      .sort((a, b) => a.price - b.price);

    return res.status(200).json({ success: true, data: { options } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Erro interno ao calcular frete' });
  }
};
