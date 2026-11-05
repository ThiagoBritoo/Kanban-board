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


  await p.fill('.column:nth-child(1) .add-input', 'Task para edição'); await p.press('.column:nth-child(1) .add-input', 'Enter'); await p.waitForTimeout(400);
  await p.locator('.card').first().click(); await p.waitForSelector('.modal');
  await p.fill('textarea[placeholder^="Escrever"]', 'comentario ainda nao enviado');
  await p.fill('textarea[placeholder^="Detalhes"]', 'descricao em edicao');
  await p.fill('.cl-add', 'item em digitacao');
  await p.evaluate(() => KBApp.loadBoard()); await p.waitForTimeout(700);
  ok((await p.locator('.modal').count()) === 1, 'modal continua aberto após recarregar o quadro');
  ok((await p.inputValue('textarea[placeholder^="Escrever"]')) === 'comentario ainda nao enviado', 'comentário digitado sobrevive à atualização');
  ok((await p.inputValue('textarea[placeholder^="Detalhes"]')) === 'descricao em edicao', 'descrição em edição sobrevive à atualização');
  ok((await p.inputValue('.cl-add')) === 'item em digitacao', 'item de checklist em digitação sobrevive');
  // colar lista no checklist
  const paste = (txt) => p.evaluate((txt) => { const i = document.querySelector('.cl-add'); const dt = new DataTransfer(); dt.setData('text', txt); i.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, txt);
  await paste('Implementação do modo escuro no mapa.\n\n* Investigação de falhas no módulo de abastecimento relacionadas ao envio de registros sem imagem.\n* Implementação de uma tela de aviso para informar quando o abastecimento ainda não foi sincronizado com o Supabase.');
  await p.waitForTimeout(500);
  const itens = () => p.evaluate(() => [...document.querySelectorAll('.cl-item, .checklist .item, .cl-row')].length);
  const t1 = await p.evaluate(() => KBApp.S.tasks.find((t) => t.title === 'Task para edição').checklist.map((i) => i.text));
  ok(t1.length === 3 && t1[0].startsWith('Implementação do modo escuro') && t1[1].startsWith('Investigação') && !t1[1].startsWith('*'), 'colar bullets cria 3 itens do checklist: ' + t1.length);
  await paste('1. primeiro\n2) segundo\n- [x] terceiro feito\n[ ] quarto');
  await p.waitForTimeout(500);
  const t2 = await p.evaluate(() => KBApp.S.tasks.find((t) => t.title === 'Task para edição').checklist);
  ok(t2.length === 7 && t2[3].text === 'primeiro' && t2[5].done === true && t2[5].text === 'terceiro feito', 'numeração, [x] e [ ] são entendidos (' + t2.length + ' itens)');
  await paste('uma linha só');
  ok((await p.evaluate(() => KBApp.S.tasks.find((t) => t.title === 'Task para edição').checklist.length)) === 7, 'colar uma linha só não cria item sozinho (cola normal)');
  // itens longos e com quebra de linha
  const longo = 'texto longo '.repeat(60).trim();
  await paste('* ' + longo + '\n  continuação na linha de baixo\n* segundo item');
  await p.waitForTimeout(500);
  const t3 = await p.evaluate(() => KBApp.S.tasks.find((t) => t.title === 'Task para edição').checklist);
  const it = t3[t3.length - 2];
  ok(it.text.length > 700 && it.text.includes('\n') && it.text.endsWith('continuação na linha de baixo'), 'item com mais de 200 caracteres e quebra de linha é guardado inteiro (' + it.text.length + ' caracteres)');
  const hs = await p.evaluate(() => [...document.querySelectorAll('textarea.cl-text')].map((e) => e.offsetHeight));
  ok(Math.max(...hs) > 60 && Math.min(...hs) < 40, 'o campo do item cresce conforme o texto (alturas ' + Math.min(...hs) + '–' + Math.max(...hs) + 'px)');
  await p.locator('textarea.cl-text').nth(0).fill('primeira linha\nsegunda linha'); await p.locator('textarea.cl-text').nth(0).blur(); await p.waitForTimeout(500);
  ok((await p.evaluate(() => KBApp.S.tasks.find((t) => t.title === 'Task para edição').checklist[0].text)) === 'primeira linha\nsegunda linha', 'editar item com quebra de linha mantém a quebra');
  // plano B: o navegador não manda "paste", só o texto com quebras no campo (o caso reportado: lista "- a\n- b" virava uma linha só)
  const antes = await p.evaluate(() => KBApp.S.tasks.find((t) => t.title === 'Task para edição').checklist.length);
  await p.evaluate(() => { const i = document.querySelector('.cl-add'); i.value = '- abastecimento\r- activityBatchItem\n- adicionarAnexos\r\n- adicionarAtivos\n- adicionarEquipe'; i.dispatchEvent(new InputEvent('input', { inputType: 'insertFromPaste', bubbles: true })); });
  await p.waitForTimeout(600);
  const dep = await p.evaluate(() => KBApp.S.tasks.find((t) => t.title === 'Task para edição').checklist.map((i) => i.text));
  ok(dep.length === antes + 5 && dep.slice(-5).join('|') === 'abastecimento|activityBatchItem|adicionarAnexos|adicionarAtivos|adicionarEquipe', 'lista "- a / - b" colada vira um item por linha mesmo sem o evento paste (+' + (dep.length - antes) + ')');
  await p.fill('.cl-add', 'digitado'); await p.keyboard.press('Shift+Enter'); await p.keyboard.type('mesma entrada'); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  ok((await p.evaluate(() => KBApp.S.tasks.find((t) => t.title === 'Task para edição').checklist.slice(-1)[0].text)) === 'digitado\nmesma entrada', 'Shift+Enter digitado continua sendo quebra de linha dentro do mesmo item');
  // limite de 150 itens
  const cento = Array.from({ length: 280 }, (_, i) => '- item ' + i).join('\n');
  await paste(cento); await p.waitForTimeout(700);
  const n = await p.evaluate(() => KBApp.S.tasks.find((t) => t.title === 'Task para edição').checklist.length);
  ok(n > 250 && n <= 300, 'checklist passa de 150 itens (agora ' + n + ', limite 300)');
  // checklist grande já salvo: ao reabrir a task, todos os itens têm altura legível (o bug: altura 0 quando o modal ainda não estava na tela)
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.locator('.card').first().click(); await p.waitForSelector('.modal'); await p.waitForTimeout(500);
  const alt = await p.evaluate(() => [...document.querySelectorAll('textarea.cl-text')].map((e) => e.offsetHeight));
  ok(alt.length > 100 && Math.min(...alt) >= 24, 'ao reabrir, os ' + alt.length + ' itens do checklist têm altura legível (mín. ' + Math.min(...alt) + 'px)');
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
