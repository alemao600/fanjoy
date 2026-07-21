const { chromium } = require('playwright');

(async () => {
  const base = process.env.E2E_BASE_URL || 'https://www.fanjoy.com.br';
  const result = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  function log(step, ok, detail = '') {
    result.push({ step, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'} - ${step}${detail ? ' :: ' + detail : ''}`);
  }

  const dialogs = [];
  page.on('dialog', async (d) => {
    dialogs.push(d.message());
    await d.accept();
  });

  try {
    await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.product-card', { timeout: 20000 });
    log('Home loads products', true);

    await page.goto(`${base}/cart.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    if ((await page.locator('.item').count()) === 0) {
      await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' });
      await page.click('.product-card .product-btn');
      await page.goto(`${base}/cart.html`, { waitUntil: 'domcontentloaded' });
    }
    await page.fill('#shippingCep', '01310-200');
    await page.click('button:has-text("Calcular")');
    await page.waitForTimeout(1200);
    dialogs.length = 0;
    await page.click('button:has-text("Finalizar compra")');
    await page.waitForTimeout(1200);
    const blockedByLogin = dialogs.some((m) => /login para finalizar/i.test(m));
    log('Checkout blocks when not logged', blockedByLogin, dialogs.join(' | '));

    const unique = `teste_${Date.now()}@mailinator.com`;
    await page.goto(`${base}/customer-login.html`, { waitUntil: 'domcontentloaded' });
    await page.click('button:has-text("Cadastrar")');
    await page.fill('#registerName', 'Teste');
    await page.fill('#registerLastName', 'Automacao');
    await page.fill('#registerEmail', unique);
    await page.fill('#registerPhone', '(11) 99999-1111');
    await page.fill('#registerPassword', 'Senha123!');
    await page.fill('#registerConfirmPassword', 'Senha123!');
    await page.click('#registerForm button[type="submit"]');
    await page.waitForTimeout(1800);
    const regSuccess = (await page.locator('#registerSuccess.show').count()) > 0;
    log('Register new user', regSuccess, unique);

    await page.click('button:has-text("Entrar")');
    await page.fill('#loginEmail', unique);
    await page.fill('#loginPassword', 'Senha123!');
    await page.click('#loginForm button[type="submit"]');
    await page.waitForURL(/customer-profile\.html|cart\.html/, { timeout: 20000 });
    const logged = /customer-profile\.html|cart\.html/.test(page.url());
    log('Login new user', logged, page.url());

    if (!/customer-profile\.html/.test(page.url())) {
      await page.goto(`${base}/customer-profile.html`, { waitUntil: 'domcontentloaded' });
    }
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => {
      if (typeof window.switchTab === 'function') window.switchTab('addresses');
    });
    await page.waitForTimeout(300);
    await page.click('button:has-text("Adicionar Endereço")');
    await page.fill('#addressLabel', 'Casa');
    await page.fill('#addressCEP', '01310-200');
    await page.fill('#addressStreet', 'Avenida Paulista');
    await page.fill('#addressNumber', '1000');
    await page.fill('#addressNeighborhood', 'Bela Vista');
    await page.fill('#addressCity', 'Sao Paulo');
    await page.selectOption('#addressState', 'SP');
    await page.click('#addressForm button[type="submit"]');
    await page.waitForTimeout(1800);
    const hasAddressCard = (await page.locator('.address-card').count()) > 0;
    log('Save address', hasAddressCard);

    await page.goto(`${base}/cart.html`, { waitUntil: 'domcontentloaded' });
    if ((await page.locator('.item').count()) === 0) {
      await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' });
      await page.click('.product-card .product-btn');
      await page.goto(`${base}/cart.html`, { waitUntil: 'domcontentloaded' });
    }
    await page.fill('#shippingCep', '01310-200');
    await page.click('button:has-text("Calcular")');
    await page.waitForTimeout(1800);

    dialogs.length = 0;
    await page.click('button:has-text("Finalizar compra")');
    await page.waitForTimeout(5000);
    const url = page.url();
    const reachedMp = /mercadopago\.com/.test(url);
    log('Checkout redirects to Mercado Pago', reachedMp, url);

  } catch (e) {
    log('General execution', false, e.message);
  } finally {
    await page.screenshot({ path: 'e2e-last-state.png', fullPage: true }).catch(() => {});
    await browser.close();
    console.log('\n===== SUMMARY =====');
    for (const r of result) console.log(`${r.ok ? 'OK' : 'ERROR'} | ${r.step} | ${r.detail}`);
    const failed = result.filter((r) => !r.ok).length;
    process.exitCode = failed ? 1 : 0;
  }
})();
