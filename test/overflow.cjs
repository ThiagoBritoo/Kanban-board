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


  const W = Number(process.argv[2] || 360); await p.setViewportSize({ width: W, height: 780 }); await p.waitForTimeout(300);
  const LONG = 'Supercalifragilisticoespialidosoextraordinariamente_longa_sem_espacos_para_estourar_o_layout_123456789';
  await p.evaluate(() => { document.documentElement.dataset.motion = 'off'; });
  for (const t of [LONG, 'Titulo normal com texto razoavelmente comprido para quebrar linha no cartao ' + LONG]) {
    await p.fill('.column:nth-child(1) .add-input', t); await p.press('.column:nth-child(1) .add-input', 'Enter'); await p.waitForTimeout(250);
  }
  const detect = (label) => p.evaluate((label) => {
    const vw = innerWidth, out = [];
    const sel = (e) => { let s = e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''); const pe = e.parentElement; return (pe ? (pe.className && typeof pe.className === 'string' ? pe.tagName.toLowerCase() + '.' + pe.className.trim().split(/\s+/)[0] : pe.tagName.toLowerCase()) + ' > ' : '') + s; };
    const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
    for (const e of document.querySelectorAll('body *')) {
      if (!vis(e) || e.closest('svg') || e.closest('#deco') || e.closest('canvas')) continue;
      const cs = getComputedStyle(e), r = e.getBoundingClientRect();
      const ox = cs.overflowX;
      // texto que passa da própria caixa
      if ((ox === 'visible') && e.scrollWidth > e.clientWidth + 1 && e.clientWidth > 0 && cs.display !== 'inline') out.push(['caixa', sel(e), e.scrollWidth + '>' + e.clientWidth, (e.textContent || '').trim().slice(0, 40)]);
      // texto que passa da tela
      for (const n of e.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) { const rg = document.createRange(); rg.selectNodeContents(n); const q = rg.getBoundingClientRect();
        if (q.width && q.right > vw + 1 && !e.closest('.board, .tbl-wrap, .list-wrap')) out.push(['fora da tela', sel(e), Math.round(q.right) + '>' + vw, n.nodeValue.trim().slice(0, 40)]);
        else if (q.width && r.width && q.right > r.right + 2 && cs.overflowX === 'visible') out.push(['passa da caixa', sel(e), Math.round(q.right - r.right) + 'px', n.nodeValue.trim().slice(0, 40)]); }
    }
    if (document.documentElement.scrollWidth > vw + 1) out.push(['pagina', 'html', document.documentElement.scrollWidth + '>' + vw, '']);
    const seen = new Set(); return out.filter((o) => { const k = o[0] + o[1]; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 25).map((o) => label + ' | ' + o.join(' | '));
  }, label);
  let all = [];
  const run = async (label) => { const r = await detect(label); all.push(...r); };
  const shot = (n) => p.screenshot({ path: OUT + n + '.png' });
  await run('quadro'); await shot('quadro-' + W);
  // sidebar (celular) e vistas
  const views = await p.locator('.topbar .seg button').count();
  for (let i = 0; i < views; i++) { await p.locator('.topbar .seg button').nth(i).click(); await p.waitForTimeout(400); await run('vista' + i); await shot('vista' + i + '-' + W); }
  await p.locator('.topbar .seg button').first().click(); await p.waitForTimeout(300);
  // modal da task
  await p.locator('.card').first().click(); await p.waitForSelector('.modal'); await p.waitForTimeout(300);
  await p.fill('.cl-add', LONG); await p.press('.cl-add', 'Enter'); await p.waitForTimeout(250);
  await p.fill('textarea[placeholder^="Detalhes"]', LONG + ' ' + LONG); await p.locator('textarea[placeholder^="Detalhes"]').blur(); await p.waitForTimeout(200);
  await p.fill('input[placeholder^="Digite e Enter"]', 'etiquetamuitolongasemespacosparaestourar' + LONG.slice(0, 30)).catch(() => {}); await p.press('input[placeholder^="Digite e Enter"]', 'Enter').catch(() => {}); await p.waitForTimeout(200);
  await p.fill('textarea[placeholder^="Escrever"]', LONG); await p.press('textarea[placeholder^="Escrever"]', 'Control+Enter'); await p.waitForTimeout(400);
  await run('modal-task'); await shot('modal-' + W); await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  // palette e diario
  await p.keyboard.press('Control+k'); await p.waitForTimeout(250); await run('paleta'); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  // personalizar: todas as abas
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Personalizar/.test(x.title + x.textContent + (x.getAttribute('aria-label') || ''))); b && b.click(); });
  if (!(await p.locator('.drawer-panel').count())) { await p.locator('.topbar button[aria-label*="Personalizar"], .topbar button[title*="Personalizar"]').first().click().catch(() => {}); }
  if (await p.locator('.drawer-panel').count()) {
    for (const t of ['Tema', 'Cores', 'Fundo', 'Cartões', 'Geral']) { await p.locator('.look-tabs button', { hasText: t }).click(); await p.waitForTimeout(250); await run('personalizar-' + t); await shot('pers-' + t + '-' + W); }
    for (const t of ['Conta', 'Equipe']) { const b = p.locator('.tabs button', { hasText: t }); if (await b.count()) { await b.click(); await p.waitForTimeout(250); await run('personalizar-' + t); } }
  } else all.push('AVISO | não achei o botão Personalizar');
  const uniq = [...new Set(all)]; console.log(uniq.length ? uniq.join('\n') : 'NENHUM estouro encontrado');
  console.log('erros JS:', errors.length ? errors.join('\n') : 'nenhum'); console.log('capturas em ' + OUT);
  await b.close(); srv.close();
})();
