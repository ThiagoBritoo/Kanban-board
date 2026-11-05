// Teste do fundo shader (WebGL por software). Uso: SUPABASE_UMD=<supabase.js> node test/shader.cjs [pasta-de-capturas]
const { chromium } = require('playwright'); const fs = require('fs'), http = require('http'), path = require('path');
const ROOT = path.join(__dirname, '..', 'public'), UMD = fs.readFileSync(process.env.SUPABASE_UMD, 'utf8'), fake = require('./fake-supabase.cjs')();
const OUT = process.argv[2] || require('os').tmpdir();
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const srv = http.createServer((q, r) => { let u = new URL(q.url, 'http://x').pathname; if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); });
(async () => {
  await new Promise((r) => srv.listen(3226, r)); const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 700 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_|Failed to load|WebSocket/.test(m.text())) errs.push(m.text()); });
  await p.route('https://cdn.jsdelivr.net/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: UMD })); await p.route('https://fonts.g*/**', (r) => r.abort()); await p.route('**/*.supabase.co/**', fake.handle);
  await p.goto('http://localhost:3226/'); await p.fill('input[type=email]', 't@x.com'); await p.fill('input[type=password]', 'senha123'); await p.click('button[type=submit]'); await p.waitForSelector('.column');
  ok(await p.evaluate(() => window.KBShader.supported()), 'WebGL disponível');
  await p.click('button[title="Personalizar"]'); await p.waitForSelector('.look-tabs'); await p.click('.look-tabs button:has-text("Fundo")'); await p.waitForSelector('.bg-grid'); await p.click('.bg-tile[title^="Gradiente shader"]'); await p.waitForSelector('.shader-box'); await p.waitForTimeout(500);
  ok((await p.evaluate(() => document.documentElement.dataset.shader)) === 'on' && (await p.evaluate(() => !!document.getElementById('shaderbg'))), 'shader ligado com canvas');
  await p.screenshot({ path: OUT + '/shader-settings.png' }); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  const pix = async () => p.evaluate(() => { const c = document.getElementById('shaderbg'); const t = document.createElement('canvas'); t.width = 8; t.height = 8; const x = t.getContext('2d'); x.drawImage(c, 0, 0, 8, 8); return [...x.getImageData(0, 0, 8, 8).data].join(','); });
  // gl.preserveDrawingBuffer é false: captura via screenshot em dois instantes
  const a = (await p.screenshot()).toString('base64'); await p.waitForTimeout(1500); const b2 = (await p.screenshot()).toString('base64');
  ok(a !== b2, 'o fundo se move');
  for (const [i, pr] of [['plane', 0], ['waves', 1], ['orb', 2]].entries()) { await p.evaluate((t) => window.KBApp.setPrefs({ shType: t[0], shC1: ['#52ff89', '#0ea5e9', '#f54e00'][t[1]], shC2: ['#dbba95', '#22d3ee', '#c08532'][t[1]], shC3: ['#d0bce1', '#6366f1', '#26251e'][t[1]] }, { refreshSettings: false }), pr); await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/shader-${pr[0]}.png` }); }
  await p.evaluate(() => window.KBApp.setPrefs({ mode: 'dark', shType: 'plane', shC1: '#ff2bd6', shC2: '#00f0ff', shC3: '#7c3aed' }, { refreshSettings: false })); await p.waitForTimeout(400); await p.screenshot({ path: OUT + '/shader-dark.png' });
  await p.evaluate(() => window.KBApp.setPrefs({ fx: false }, { refreshSettings: false })); await p.waitForTimeout(300); const s1 = (await p.screenshot()).toString('base64'); await p.waitForTimeout(1200); console.log('fx desligado = parado:', s1 === (await p.screenshot()).toString('base64'));
  ok(!errs.length, 'sem erros de JS' + (errs.length ? ': ' + errs.join(' | ') : '')); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
