// Teste do fundo "fundos de efeito (fx.js)" (Lightfall em WebGL, os demais em Canvas 2D). Uso: SUPABASE_UMD=<supabase.js> node test/terrain.cjs [pasta-de-capturas]
const { chromium } = require('playwright'); const fs = require('fs'), http = require('http'), path = require('path'), os = require('os');
const ROOT = path.join(__dirname, '..', 'public'), UMD = fs.readFileSync(process.env.SUPABASE_UMD || require.resolve('@supabase/supabase-js/dist/umd/supabase.js'), 'utf8'), fake = require('./fake-supabase.cjs')();
const OUT = process.argv[2] || os.tmpdir(); let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const srv = http.createServer((q, r) => { let u = new URL(q.url, 'http://x').pathname; if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); });
(async () => {
  await new Promise((r) => srv.listen(3229, r)); const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1200, height: 760 } })).newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_|Failed to load|WebSocket/.test(m.text())) errs.push(m.text()); });
  await p.route('https://cdn.jsdelivr.net/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: UMD })); await p.route('https://fonts.g*/**', (r) => r.abort()); await p.route('**/*.supabase.co/**', fake.handle);
  await p.goto('http://localhost:3229/'); await p.fill('input[type=email]', 't@x.com'); await p.fill('input[type=password]', 'senha123'); await p.click('button[type=submit]'); await p.waitForSelector('.column');
  await p.click('button[title="Personalizar"]'); await p.waitForSelector('.look-tabs'); await p.click('.look-tabs button:has-text("Fundo")'); await p.waitForSelector('.bg-grid');

  const tiles = { lightfall: 'Lightfall', gridhole: 'Grid Hole', ink: 'Ink Flow', parallax: 'Parallax' };
  for (const [id, nm] of Object.entries(tiles)) {
    await p.click(`.bg-tile[title^="${nm}"]`); await p.waitForSelector('.shader-box'); await p.waitForTimeout(700);
    ok(await p.evaluate((i) => document.documentElement.dataset.fxbg === i && !!document.getElementById('fxbg'), id), id + ': canvas ligado');
    if (id === 'lightfall' || id === 'ink') ok(await p.evaluate(() => { const g = document.getElementById('fxgl'); return !!g && getComputedStyle(g).display !== 'none' && getComputedStyle(document.getElementById('fxbg')).display === 'none'; }), id + ': desenhando em WebGL');
    const a = (await p.screenshot()).toString('base64'); await p.waitForTimeout(1200); ok(a !== (await p.screenshot()).toString('base64'), id + ': se move');
    await p.screenshot({ path: OUT + `/fx-${id}-dark.png` });
    const bn = await p.evaluate(() => window.KBFx.bench(20)); ok(bn && bn.ms < 40, id + ': custo ' + (bn ? bn.ms.toFixed(1) : '?') + ' ms/quadro (software)');
  }
  ok((await p.locator('.shader-box input[type=range]').count()) === 2 && (await p.locator('.shader-box input[type=color]').count()) === 3, 'controles: 2 sliders e 3 cores');
  await p.click('.preset-chip[title="Gelo"]'); await p.waitForTimeout(500); await p.click('.bg-tile[title^="Lightfall"]'); await p.waitForTimeout(500); await p.screenshot({ path: OUT + '/fx-lightfall-gelo.png' });
  await p.click('.look-tabs button:has-text("Cartões")'); await p.waitForTimeout(200);
  await p.click('.seg button:has-text("Pulsar: alta e urgente")'); await p.click('label.check:has-text("Luz caindo")'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.documentElement.dataset.pulse === 'high' && document.documentElement.dataset.cardlight === 'on'), 'pulso e luz do cartão ligados');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  const anim = await p.evaluate(() => { const c = document.querySelector('.card[data-p="3"],.card[data-p="2"]'); return c ? getComputedStyle(c).animationName : 'sem-card'; });
  ok(anim === 'ring' || anim === 'sem-card', 'cartão prioritário anima o anel (' + anim + ')');
  await p.evaluate(() => window.KBApp.setPrefs({ fx: false }, { refreshSettings: false })); await p.waitForTimeout(300);
  ok(await p.evaluate(() => { const c = document.querySelector('.card[data-p="3"],.card[data-p="2"]'); return !c || getComputedStyle(c).animationName === 'none'; }), 'sem animação com fundo animado desligado');
  const f1 = (await p.screenshot()).toString('base64'); await p.waitForTimeout(1000); ok(f1 === (await p.screenshot()).toString('base64'), 'fundo parado com fx desligado');
  await p.evaluate(() => window.KBApp.setPrefs({ fx: true, bg: 'theme' }, { refreshSettings: false })); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.documentElement.dataset.fxbg === 'off'), 'voltar ao fundo do tema desliga o canvas');
  for (const [th, ty] of [['chuvaluz', 'lightfall'], ['singular', 'gridhole'], ['nanquim', 'ink'], ['cordilheira', 'parallax']]) for (const m of ['light', 'dark']) {
    await p.evaluate(([t, mm]) => window.KBApp.setPrefs({ theme: t, mode: mm, bg: 'theme', fx: true }, { refreshSettings: false }), [th, m]); await p.waitForTimeout(900);
    ok(await p.evaluate((t) => document.documentElement.dataset.fxbg === t, ty), `tema ${th} (${m}) liga ${ty}`); await p.screenshot({ path: OUT + `/tema-${th}-${m}.png` });
  }
  await p.evaluate(() => window.KBApp.setPrefs({ theme: 'minimal', bg: 'theme' }, { refreshSettings: false })); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.documentElement.dataset.fxbg === 'off'), 'sair do tema desliga o fundo');
  await p.setViewportSize({ width: 390, height: 800 }); await p.evaluate(() => window.KBApp.setPrefs({ theme: 'chuvaluz', mode: 'dark', bg: 'theme', fx: true }, { refreshSettings: false })); await p.waitForTimeout(900);
  ok(await p.evaluate(() => document.documentElement.dataset.fxbg === 'lightfall' && document.getElementById('fxgl').width > 64), 'celular: Lightfall em WebGL ligado'); await p.screenshot({ path: OUT + '/tema-chuvaluz-celular.png' });
  ok(!errs.length, 'sem erros de JS' + (errs.length ? ': ' + errs.join(' | ') : '')); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
