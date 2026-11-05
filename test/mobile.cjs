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
  const { devices } = require('playwright'); const ctx = await b.newContext({ ...devices['iPhone 13'] });
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
  await p.tap('button[title*="Nova task"]'); await p.waitForSelector('.big-input'); await p.fill('.big-input', 'Pedir orçamento do servidor #infra !alta ^amanhã'); await p.tap('button:has-text("Criar")'); await p.waitForTimeout(600);
  ok((await p.locator('.card').count()) === 1, 'criar task pelo botão + no celular');
  await p.tap('.card'); await p.waitForSelector('.modal'); await p.waitForTimeout(300); await shot('m-modal');
  await p.tap('.seg button:has-text("Urgente")'); await p.waitForTimeout(400);
  await p.tap('.modal-head button[aria-label*="echar"], .modal-head .btn.ghost.icon'); await p.waitForTimeout(400);
  ok((await p.locator('.card[data-p="3"]').count()) === 1, 'prioridade urgente aplicada pelo toque');
  await p.tap('.card .card-menu'); await p.waitForSelector('.popover'); await shot('m-menu'); await p.tap('.popover >> text=Prazo: hoje'); await p.waitForTimeout(500);
  await p.tap('button[aria-label="Mais opções"]'); await p.waitForSelector('.popover'); await p.tap('.popover >> text=Lixeira'); await p.waitForSelector('.modal'); await shot('m-lixeira'); await p.keyboard.press('Escape');
  console.log('erros JS:', errors.length ? errors.join('\n') : 'nenhum'); console.log(OUT);
  await b.close(); srv.close(); process.exit(fails || errors.length ? 1 : 0);
})();
