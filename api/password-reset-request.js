const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
const { getEnv } = require('./_admin-common');

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attempts = new Map();

function json(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(payload);
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getClientKey(req, email) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  return `${ip}:${email}`;
}

function checkRateLimit(req, email) {
  const key = getClientKey(req, email);
  const now = Date.now();
  const current = attempts.get(key) || { count: 0, resetAt: now + WINDOW_MS };
  if (now > current.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  current.count += 1;
  attempts.set(key, current);
  return current.count <= MAX_ATTEMPTS;
}

function resolveBaseUrl(req) {
  const rawHost = String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  const allowedHosts = new Set([
    'fanjoy.com.br',
    'www.fanjoy.com.br',
    'fanjoy-fawn.vercel.app',
    'fanjoy-xi.vercel.app',
    'localhost:4173',
    'localhost:3000'
  ]);
  const isFanjoyVercelAlias = /^fanjoy-[a-z0-9-]+\.vercel\.app$/.test(rawHost)
    || /^fanjoy-[a-z0-9-]+-renee-carriel-s-projects\.vercel\.app$/.test(rawHost);
  if (!allowedHosts.has(rawHost) && !isFanjoyVercelAlias) {
    const err = new Error('Origem invalida');
    err.status = 400;
    throw err;
  }
  const proto = rawHost.startsWith('localhost:') ? 'http' : 'https';
  return `${proto}://${rawHost}`;
}

function getSupabaseAdmin() {
  const url = getEnv('SUPABASE_URL') || getEnv('FANJOY_SUPABASE_URL');
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY')
    || getEnv('SUPABASE_SECRET_KEY')
    || getEnv('SUPABASE_SERVICE_KEY')
    || getEnv('FANJOY_SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Supabase nao configurado');
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

async function sendViaSupabaseAuth(supabase, email, redirectTo) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

function getMailer() {
  const user = getEnv('FANJOY_SMTP_USER') || getEnv('SMTP_USER');
  const pass = getEnv('FANJOY_SMTP_PASS') || getEnv('SMTP_PASS');
  if (!user || !pass) throw new Error('SMTP nao configurado');
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 10000
  });
}

function buildEmailHtml(resetUrl) {
  return `
    <div style="font-family:Arial,sans-serif;background:#fff7fc;padding:24px;color:#1f2937;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #f7c6e7;border-radius:18px;padding:28px;">
        <h1 style="margin:0 0 12px;color:#d946ef;">Redefinir senha Fanjoy</h1>
        <p style="font-size:15px;line-height:1.6;">Recebemos uma solicitação para redefinir a senha da sua conta Fanjoy.</p>
        <p style="font-size:15px;line-height:1.6;">Clique no botão abaixo para criar uma nova senha:</p>
        <p style="margin:24px 0;">
          <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#ff6bce,#7c3aed);color:#fff;text-decoration:none;padding:14px 22px;border-radius:12px;font-weight:700;">
            Redefinir minha senha
          </a>
        </p>
        <p style="font-size:13px;color:#6b7280;line-height:1.5;">Se você não pediu essa alteração, ignore este e-mail. Sua senha atual continuará igual.</p>
      </div>
    </div>
  `;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return json(res, 405, { success: false, message: 'Metodo nao permitido' });
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const email = normalizeEmail(body?.email);
  const generic = {
    success: true,
    message: 'Se este e-mail estiver cadastrado, enviaremos um link de recuperacao.'
  };

  if (!isValidEmail(email)) return json(res, 200, generic);
  if (!checkRateLimit(req, email)) return json(res, 200, generic);

  try {
    const baseUrl = resolveBaseUrl(req);
    const redirectTo = `${baseUrl}/reset-password.html`;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo
      }
    });

    if (error || !data?.properties?.action_link) {
      console.error('Falha ao gerar link de recuperacao:', error?.message || 'link ausente');
      return json(res, 200, generic);
    }

    const mailer = getMailer();
    const from = getEnv('FANJOY_SMTP_USER') || 'contato.fanjoy@gmail.com';
    try {
      await mailer.sendMail({
        from: `"Fanjoy" <${from}>`,
        to: email,
        subject: 'Recuperacao de senha Fanjoy',
        text: `Use este link para redefinir sua senha Fanjoy: ${data.properties.action_link}`,
        html: buildEmailHtml(data.properties.action_link)
      });
    } catch (mailError) {
      console.error('Falha SMTP; usando fallback Supabase:', mailError.message);
      try {
        await sendViaSupabaseAuth(supabase, email, redirectTo);
      } catch (fallbackError) {
        const fallbackMessage = String(fallbackError?.message || '');
        if (/security purposes|rate limit|after \d+ seconds/i.test(fallbackMessage)) {
          console.error('Recuperacao limitada temporariamente pelo Supabase:', fallbackMessage);
          return json(res, 200, generic);
        }
        throw fallbackError;
      }
    }

    return json(res, 200, generic);
  } catch (error) {
    console.error('Erro no envio de recuperacao:', error.message);
    return json(res, 500, {
      success: false,
      message: 'Nao foi possivel enviar o e-mail agora. Tente novamente em alguns minutos.'
    });
  }
};
