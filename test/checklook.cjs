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


  await p.fill('.column:nth-child(1) .add-input', 'Task checklist legível'); await p.press('.column:nth-child(1) .add-input', 'Enter'); await p.waitForTimeout(400);
  await p.evaluate(() => KBApp.setPrefs({ mode: 'dark' }, { refreshSettings: false }));
  await p.locator('.card').first().click(); await p.waitForSelector('.modal'); await p.waitForTimeout(300);
  await p.evaluate(() => { const i = document.querySelector('.cl-add'); i.value = Array.from({ length: 12 }, (_, k) => '- item número ' + k + ' do checklist com texto razoavelmente comprido').join('\n'); i.dispatchEvent(new InputEvent('input', { inputType: 'insertFromPaste', bubbles: true })); });
  await p.waitForTimeout(600);
  await p.locator('.cl-item .cl-text').nth(1).evaluate((e) => e.parentElement.querySelector('input[type=checkbox]').click()); await p.waitForTimeout(400);
  const cores = await p.evaluate(() => { const bg = getComputedStyle(document.querySelector('.modal')).backgroundColor; return { bg, normal: getComputedStyle(document.querySelector('.cl-item:not(.done) .cl-text')).color, feito: getComputedStyle(document.querySelector('.cl-item.done .cl-text')).color, add: getComputedStyle(document.querySelector('.cl-add')).color }; });
  console.log(JSON.stringify(cores));
  await p.locator('.cl-item').first().scrollIntoViewIfNeeded(); await p.screenshot({ path: OUT + 'check-escuro.png' });
  await p.evaluate(() => KBApp.setPrefs({ mode: 'light' }, { refreshSettings: false })); await p.waitForTimeout(300); await p.screenshot({ path: OUT + 'check-claro.png' });
  console.log(OUT); await b.close(); srv.close();
})();
