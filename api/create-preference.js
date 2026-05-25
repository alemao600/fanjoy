module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) {
      return res.status(500).json({ success: false, message: "MP_ACCESS_TOKEN não configurado" });
    }

    const { items, orderId, customerEmail, successUrl, failureUrl, pendingUrl } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Itens inválidos" });
    }

    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const proto = req.headers["x-forwarded-proto"] || "https";
    const webhookUrl = host ? `${proto}://${host}/api/mp-webhook` : undefined;

    const payload = {
      items: items.map((item) => ({
        title: item.title,
        quantity: Number(item.quantity || 1),
        unit_price: Number(item.unit_price || 0),
        currency_id: "BRL"
      })),
      external_reference: String(orderId || Date.now()),
      payer: customerEmail ? { email: customerEmail } : undefined,
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl
      },
      notification_url: webhookUrl,
      auto_return: "approved"
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await mpRes.json();

    if (!mpRes.ok) {
      return res.status(500).json({ success: false, message: data.message || "Erro Mercado Pago", details: data });
    }

    return res.status(200).json({
      success: true,
      data: {
        init_point: data.init_point,
        sandbox_init_point: data.sandbox_init_point,
        preference_id: data.id
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Erro interno" });
  }
};
