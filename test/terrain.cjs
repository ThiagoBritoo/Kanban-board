// Teste do fundo "Terreno de arame" (Canvas 2D). Uso: SUPABASE_UMD=<supabase.js> node test/terrain.cjs [pasta-de-capturas]
const { chromium } = require('playwright'); const fs = require('fs'), http = require('http'), path = require('path'), os = require('os');
const ROOT = path.join(__dirname, '..', 'public'), UMD = fs.readFileSync(process.env.SUPABASE_UMD || require.resolve('@supabase/supabase-js/dist/umd/supabase.js'), 'utf8'), fake = require('./fake-supabase.cjs')();
const OUT = process.argv[2] || os.tmpdir(); let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const srv = http.createServer((q, r) => { let u = new URL(q.url, 'http://x').pathname; if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); });
(async () => {
  await new Promise((r) => srv.listen(3228, r)); const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1200, height: 760 } })).newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_|Failed to load|WebSocket/.test(m.text())) errs.push(m.text()); });
  await p.route('https://cdn.jsdelivr.net/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: UMD })); await p.route('https://fonts.g*/**', (r) => r.abort()); await p.route('**/*.supabase.co/**', fake.handle);
  await p.goto('http://localhost:3228/'); await p.fill('input[type=email]', 't@x.com'); await p.fill('input[type=password]', 'senha123'); await p.click('button[type=submit]'); await p.waitForSelector('.column');
  await p.click('button[title="Personalizar"]'); await p.waitForSelector('.look-tabs'); await p.click('.look-tabs button:has-text("Fundo")'); await p.waitForSelector('.bg-grid');
  await p.click('.bg-tile[title^="Terreno"]'); await p.waitForSelector('.shader-box'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => document.documentElement.dataset.terrain === 'on' && !!document.getElementById('terrainbg')), 'terreno ligado com canvas');
  ok((await p.locator('.shader-box input[type=range]').count()) === 8 && (await p.locator('.shader-box input[type=color]').count()) === 3, 'controles: 8 sliders e 3 cores');
  await p.screenshot({ path: OUT + '/terrain-settings.png' });
  const a = (await p.screenshot()).toString('base64'); await p.waitForTimeout(1500); const b2 = (await p.screenshot()).toString('base64'); ok(a !== b2, 'o terreno se move');
  for (const k of ['papel', 'carvao', 'synth', 'pontos']) { await p.click(`.preset-chip[title="${{ papel: 'Papel', carvao: 'Carvão', synth: 'Synthwave', pontos: 'Pontos' }[k]}"]`); await p.waitForTimeout(500); await p.keyboard.press('Escape'); await p.waitForTimeout(250); await p.screenshot({ path: `${OUT}/terrain-${k}.png` }); await p.click('button[title="Personalizar"]'); await p.waitForSelector('.look-tabs'); await p.click('.look-tabs button:has-text("Fundo")'); await p.waitForSelector('.shader-box'); }
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  await p.evaluate(() => window.KBApp.setPrefs({ fx: false }, { refreshSettings: false })); await p.waitForTimeout(300); const s1 = (await p.screenshot()).toString('base64'); await p.waitForTimeout(1200);
  ok(s1 === (await p.screenshot()).toString('base64'), 'com fundo animado desligado o terreno fica parado');
  await p.evaluate(() => window.KBApp.setPrefs({ fx: true, bg: 'theme', theme: 'topografia', mode: 'light' }, { refreshSettings: false })); await p.waitForTimeout(700);
  ok(await p.evaluate(() => document.documentElement.dataset.terrain === 'on'), 'tema Topografia liga o terreno sozinho'); await p.screenshot({ path: OUT + '/topografia-light.png' });
  await p.evaluate(() => window.KBApp.setPrefs({ mode: 'dark' }, { refreshSettings: false })); await p.waitForTimeout(700); await p.screenshot({ path: OUT + '/topografia-dark.png' });
  await p.evaluate(() => window.KBApp.setPrefs({ theme: 'minimal', bg: 'theme' }, { refreshSettings: false })); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.documentElement.dataset.terrain === 'off'), 'sair do tema desliga o terreno');
  ok(!errs.length, 'sem erros de JS' + (errs.length ? ': ' + errs.join(' | ') : '')); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
