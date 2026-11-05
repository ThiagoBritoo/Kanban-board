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


  await p.evaluate(() => { window.__log = []; const sc = Element.prototype.scrollIntoView; Element.prototype.scrollIntoView = function (...a) { window.__log.push('scrollIntoView ' + this.className); return sc.apply(this, a); }; const f = HTMLElement.prototype.focus; HTMLElement.prototype.focus = function (...a) { window.__log.push('focus ' + this.tagName + '.' + this.className + ' ' + JSON.stringify(a[0] || {})); return f.apply(this, a); }; document.addEventListener('scroll', (e) => window.__log.push('scroll ' + (e.target.className || e.target.nodeName)), true); });
  await p.fill('.column:nth-child(1) .add-input', 'Teste menu'); await p.press('.column:nth-child(1) .add-input', 'Enter'); await p.waitForTimeout(400);
  const sl = () => p.evaluate(() => [document.querySelector('.board').scrollLeft, document.querySelector('.board').scrollWidth, document.querySelector('.board').clientWidth, document.querySelector('.column').getBoundingClientRect().left]);
  console.log('apos criar', await sl()); await p.locator('.card').first().hover(); console.log('apos hover', await sl()); console.log('rects', JSON.stringify(await p.evaluate(() => ['.card', '.card-menu', '.card-exp'].map((q) => { const e = document.querySelector(q); if (!e) return q + ' ausente'; const r = e.getBoundingClientRect(); return [q, Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height), getComputedStyle(e).position]; })))); await p.locator('.card').first().locator('.card-menu').click(); await p.waitForTimeout(400);
  console.log(JSON.stringify(await p.evaluate(() => { const e = document.querySelector('.popover'); const r = e && e.getBoundingClientRect(); const c = document.querySelector('.card-menu').getBoundingClientRect(); return { pop: r && [r.left, r.top, r.width, r.height], card: [c.left, c.top, c.width] , z: e && getComputedStyle(e).zIndex}; })));
  console.log('log:', JSON.stringify(await p.evaluate(() => window.__log)));
  await p.screenshot({ path: OUT + 'menu.png' }); console.log(OUT);
  await b.close(); srv.close();
})();
