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


  await p.setViewportSize({ width: 390, height: 800 });
  for (let k = 1; k <= 12; k++) { await p.fill('.column:nth-child(1) .add-input', 'Tarefa ' + k); await p.press('.column:nth-child(1) .add-input', 'Enter'); await p.waitForTimeout(100); }
  await p.waitForTimeout(300);
  await p.evaluate(() => { document.querySelector('.col-body').scrollTop = 150; document.querySelector('.board').scrollLeft = 250; });
  await p.waitForTimeout(200);
  const st = () => p.evaluate(() => [document.querySelector('.col-body').scrollTop, document.querySelector('.board').scrollLeft, window.scrollY]);
  const s0 = await st(); console.log('antes', s0);
  console.log(await p.evaluate(() => { const b = document.querySelector('.board'); const o = [b.scrollLeft]; KBApp.renderBoard(); o.push(b.scrollLeft); b.scrollLeft = 344; o.push(b.scrollLeft, b.scrollWidth, b.clientWidth, [...b.children].map(c => c.className + ':' + Math.round(c.getBoundingClientRect().width)).join(',')); return o; }));
  await p.evaluate(() => KBApp.renderBoard()); await p.waitForTimeout(300); { const s1 = await st(); ok(s1[0] === s0[0] && s1[1] === s0[1], 'renderBoard mantém a rolagem do quadro e da coluna ' + s1); }
  await p.evaluate(() => KBApp.loadBoard()); await p.waitForTimeout(600); { const s2 = await st(); ok(s2[0] === s0[0] && s2[1] === s0[1], 'loadBoard mantém a rolagem ' + s2); }
  // rascunho no campo de adicionar
  await p.fill('.column:nth-child(1) .add-input', 'rascunho'); await p.evaluate(() => KBApp.renderBoard()); await p.waitForTimeout(200);
  ok((await p.inputValue('.column:nth-child(1) .add-input')) === 'rascunho', 'rascunho do campo de adicionar sobrevive ao redesenho');
  // abrir task, fechar -> posição
  await p.locator('.card').nth(5).click(); await p.waitForSelector('.modal'); await p.keyboard.press('Escape'); await p.waitForTimeout(300); 
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
