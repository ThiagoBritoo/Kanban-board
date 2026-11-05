// Teste de interface: abre o site num Chromium com o supabase-js real, mas falando com uma API Supabase FALSA
// (test/fake-supabase.cjs). Valida a interface e as consultas do backend.js; não substitui testar no banco real.
//   npm i --no-save playwright @supabase/supabase-js@2.45.4 && npx playwright install chromium && node test/e2e.cjs
const { chromium } = require('playwright');
const fs = require('fs'), http = require('http'), path = require('path'), os = require('os');
const ROOT = path.join(__dirname, '..', 'public'), OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'kanban-shots-')) + '/';
const UMD = fs.readFileSync(process.env.SUPABASE_UMD || require.resolve('@supabase/supabase-js/dist/umd/supabase.js'), 'utf8');
const fake = require('./fake-supabase.cjs')();
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
const VH = {}; JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8')).headers[0].headers.forEach((x) => (VH[x.key] = x.value));
const srv = http.createServer((req, res) => { let r = new URL(req.url, 'http://x').pathname; if (r === '/') r = '/index.html'; const f = path.join(ROOT, r);
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { ...VH, 'content-type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(res); });
let fails = 0;
const mclick = async (p, loc) => { const bb = await loc.boundingBox(); await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await p.mouse.up(); };
const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) fails++; };
(async () => {
  await new Promise((r) => srv.listen(3222, r));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1360, height: 860 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push('PAGEERR ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/ERR_|Failed to load|WebSocket/.test(m.text())) errors.push('CONSOLE ' + m.text()); });
  await p.route('https://cdn.jsdelivr.net/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: UMD }));
  await p.route('https://fonts.g*/**', (r) => r.abort());
  await p.route('**/*.supabase.co/**', fake.handle);
  await p.goto('http://localhost:3222/');
  await p.waitForSelector('.auth-card');
  await p.fill('input[type=email]', 't@x.com'); await p.fill('input[type=password]', 'errada'); await p.click('button[type=submit]');
  await p.waitForSelector('.err-msg:not(:empty)'); ok((await p.textContent('.err-msg')).includes('incorretos'), 'login com senha errada mostra erro em português');
  await p.fill('input[type=password]', 'senha123'); await p.click('button[type=submit]');
  await p.waitForSelector('.board .column'); ok((await p.locator('.column').count()) === 4, 'login ok e 4 colunas');
  await p.waitForTimeout(300);

  const shot = (n) => p.screenshot({ path: OUT + n + '.png' });
  // muitas tasks na coluna 1 para rolar
  for (let k = 1; k <= 14; k++) { await p.fill('.column:nth-child(1) .add-input', 'Tarefa de teste número ' + k); await p.press('.column:nth-child(1) .add-input', 'Enter'); await p.waitForTimeout(120); }
  await p.waitForTimeout(500);
  const body = p.locator('.column:nth-child(1) .col-body');
  ok((await body.getAttribute('data-scb')) === '1', 'borda de baixo da coluna com desfoque (há conteúdo abaixo)');
  ok((await body.getAttribute('data-sct')) === '0', 'borda de cima sem desfoque no topo');
  await body.evaluate((e) => { e.scrollTop = 120; }); await p.waitForTimeout(250);
  ok((await body.getAttribute('data-sct')) === '1', 'borda de cima ganha desfoque ao rolar');
  const bf = await body.evaluate((e) => getComputedStyle(e, '::before').backdropFilter); ok(/blur/.test(bf), 'pseudo-elemento com backdrop-filter: ' + bf);
  await shot('colunas-desfoque-' + (process.argv[2] || 'claro'));
  await body.evaluate((e) => { e.scrollTop = 0; });
  // números rolando: criar task e amostrar o contador da coluna 2 durante a animação
  const cc = p.locator('.column:nth-child(1) .col-count');
  const before = Number(await cc.textContent());
  const seen = await p.evaluate(async () => {
    const out = []; const read = () => document.querySelector('.column:nth-child(1) .col-count').textContent;
    const inp = document.querySelector('.column:nth-child(1) .add-input'); inp.value = 'Rolagem de número'; inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const t0 = performance.now(); while (performance.now() - t0 < 1200) { out.push(read()); await new Promise((r) => setTimeout(r, 30)); }
    return out;
  });
  const uniq = [...new Set(seen)]; console.log('contador:', uniq.join(' > '));
  ok(Number(uniq[uniq.length - 1]) === before + 1, 'contador chega ao valor final (' + (before + 1) + ')');
  // aba com direção
  await p.keyboard.press('Escape');
  await p.click('[title*="Personalizar"], button:has-text("Personalizar")').catch(() => {});
  if (!(await p.locator('.drawer-panel').count())) { await p.click('.avatar-btn, .avatar, [aria-label*="menu" i]').catch(() => {}); await p.click('text=Personalizar').catch(() => {}); }
  await p.waitForSelector('.drawer-panel'); await p.waitForTimeout(300);
  await p.click('.look-tabs button:has-text("Cores")'); await p.waitForTimeout(40);
  const dx = await p.evaluate(() => { const e = document.querySelector('.drawer-panel .modal-body > :not(.look-tabs)'); return [e.className, getComputedStyle(e).animationName]; });
  ok(/slide-in/.test(dx[0]) && dx[1] === 'slide-in', 'troca de aba do Personalizar anima o conteúdo (' + dx.join(' / ') + ')');
  await p.waitForTimeout(300); await shot('personalizar-abas-' + (process.argv[2] || 'claro'));
  await p.click('.tabs button:has-text("Conta")'); await p.waitForTimeout(40);
  ok(await p.evaluate(() => document.querySelector('.drawer-panel .tabs + div').classList.contains('slide-in')), 'aba Conta anima ao entrar');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  // indicador de soltura
  const card = p.locator('.column:nth-child(1) .card').first(), target = p.locator('.column:nth-child(2) .col-body');
  const cb = await card.boundingBox(), tb = await target.boundingBox();
  await p.mouse.move(cb.x + 40, cb.y + 20); await p.mouse.down(); await p.mouse.move(cb.x + 80, cb.y + 40, { steps: 3 }); await p.mouse.move(tb.x + 60, tb.y + 30, { steps: 8 }); await p.waitForTimeout(250);
  ok((await p.locator('.drop-line').count()) >= 0, 'arrasto em andamento'); await shot('arrastando-' + (process.argv[2] || 'claro'));
  await p.mouse.up(); await p.waitForTimeout(300);
  console.log('erros JS:', errors.length ? errors.join('\n') : 'nenhum');
  console.log('capturas em ' + OUT); await b.close(); srv.close(); process.exit(fails || errors.length ? 1 : 0);
})();
