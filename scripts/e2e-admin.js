const { chromium } = require('playwright');

(async () => {
  const base = 'https://www.rvbot.com.br';
  const result = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 920 }, acceptDownloads: true });
  const page = await context.newPage();
  const dialogs = [];

  page.on('dialog', async (d) => {
    dialogs.push(d.message());
    await d.accept();
  });

  function log(step, ok, detail = '') {
    result.push({ step, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'} - ${step}${detail ? ' :: ' + detail : ''}`);
  }

  let tempCategory = `TesteCat_${Date.now()}`;
  let tempProduct = `TesteProd_${Date.now()}`;

  try {
    await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/admin\.html/, { timeout: 15000 });
    log('Admin login', /admin\.html/.test(page.url()));

    await page.waitForSelector('#tab-dashboard.active', { timeout: 10000 });
    log('Dashboard renderiza', true);

    // Categories tab + create/delete
    await page.click('.tab-btn[data-tab="categories"]');
    await page.waitForSelector('#tab-categories.active');
    await page.fill('#newCategory', tempCategory);
    await page.click('#tab-categories button:has-text("Adicionar")');
    await page.waitForTimeout(1200);
    const hasCatChip = await page.locator('#categoriesList .chip', { hasText: tempCategory }).count();
    log('Criar categoria', hasCatChip > 0, tempCategory);

    // Products tab + create/edit/delete
    await page.click('.tab-btn[data-tab="products"]');
    await page.waitForSelector('#tab-products.active');
    await page.fill('#name', tempProduct);
    await page.fill('#description', 'Produto de teste automático');
    await page.fill('#price', '39.90');
    await page.fill('#tag', 'QA');
    await page.fill('#buttonText', 'Comprar');
    await page.fill('#images', 'https://picsum.photos/seed/qa1/600/600');

    // select created category
    const check = page.locator('#categoryChecks label', { hasText: tempCategory }).locator('input[type="checkbox"]');
    if (await check.count()) await check.check();

    // variants
    await page.fill('.variant-stock-input[data-size="P"]', '2');
    await page.fill('.variant-stock-input[data-size="M"]', '3');
    await page.fill('.variant-stock-input[data-size="G"]', '4');
    await page.fill('.variant-stock-input[data-size="GG"]', '5');

    await page.click('#tab-products button:has-text("Salvar Produto")');
    await page.waitForTimeout(1800);
    const hasProd = await page.locator('#productsRows tr', { hasText: tempProduct }).count();
    log('Criar produto', hasProd > 0, tempProduct);

    // Edit product price
    const prodRow = page.locator('#productsRows tr', { hasText: tempProduct }).first();
    await prodRow.locator('button:has-text("Editar")').click();
    await page.waitForTimeout(600);
    await page.fill('#price', '44.90');
    await page.click('#tab-products button:has-text("Salvar Produto")');
    await page.waitForTimeout(1500);
    const updatedPrice = await page.locator('#productsRows tr', { hasText: tempProduct }).locator('td').nth(1).innerText();
    log('Editar produto', /44\.90/.test(updatedPrice), updatedPrice);

    // Content tab save/reload
    await page.click('.tab-btn[data-tab="content"]');
    await page.waitForSelector('#tab-content.active');
    const oldTitle = await page.inputValue('#cfgHeroTitle');
    const newTitle = oldTitle + ' [QA]';
    await page.fill('#cfgHeroTitle', newTitle);
    await page.click('#tab-content button:has-text("Salvar Conteúdo")');
    await page.waitForTimeout(500);
    await page.click('#tab-content button:has-text("Recarregar")');
    await page.waitForTimeout(500);
    const loadedTitle = await page.inputValue('#cfgHeroTitle');
    log('Salvar/Recarregar conteúdo', loadedTitle === newTitle);

    // Theme tab save/reset
    await page.click('.tab-btn[data-tab="theme"]');
    await page.waitForSelector('#tab-theme.active');
    await page.fill('#themeAccent', '#ff44aa');
    await page.click('#tab-theme button:has-text("Salvar Tema")');
    await page.waitForTimeout(400);
    await page.click('#tab-theme button:has-text("Resetar Tema")');
    await page.waitForTimeout(400);
    const accentAfterReset = await page.inputValue('#themeAccent');
    log('Tema salvar/resetar', accentAfterReset.toLowerCase() === '#ff6bce', accentAfterReset);

    // Tools export
    await page.click('.tab-btn[data-tab="tools"]');
    await page.waitForSelector('#tab-tools.active');
    const [ download ] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#tab-tools button:has-text("Exportar Configuração")')
    ]);
    log('Exportar configuração', !!download, await download.suggestedFilename());

    // Orders tab loads
    await page.click('.tab-btn[data-tab="orders"]');
    await page.waitForSelector('#tab-orders.active');
    await page.click('#tab-orders button:has-text("Atualizar")');
    await page.waitForTimeout(1500);
    const orderRows = await page.locator('#ordersRows tr').count();
    log('Aba pedidos carrega', orderRows > 0, `linhas=${orderRows}`);

    // Cleanup: delete product
    await page.click('.tab-btn[data-tab="products"]');
    await page.waitForSelector('#tab-products.active');
    const row2 = page.locator('#productsRows tr', { hasText: tempProduct }).first();
    if (await row2.count()) {
      await row2.locator('button:has-text("Excluir")').click();
      await page.waitForTimeout(1200);
    }
    const stillProd = await page.locator('#productsRows tr', { hasText: tempProduct }).count();
    log('Excluir produto', stillProd === 0);

    // Cleanup: delete category
    await page.click('.tab-btn[data-tab="categories"]');
    await page.waitForSelector('#tab-categories.active');
    const catChip = page.locator('#categoriesList .chip', { hasText: tempCategory }).first();
    if (await catChip.count()) {
      await catChip.locator('button').click();
      await page.waitForTimeout(1200);
    }
    const stillCat = await page.locator('#categoriesList .chip', { hasText: tempCategory }).count();
    log('Excluir categoria', stillCat === 0);

  } catch (e) {
    log('Execução geral admin', false, e.message);
  } finally {
    await page.screenshot({ path: 'admin-e2e-last-state.png', fullPage: true }).catch(() => {});
    await browser.close();

    console.log('\n===== ADMIN TEST SUMMARY =====');
    for (const r of result) {
      console.log(`${r.ok ? 'OK' : 'ERROR'} | ${r.step} | ${r.detail}`);
    }
    const failed = result.filter((r) => !r.ok).length;
    process.exitCode = failed ? 1 : 0;
  }
})();

