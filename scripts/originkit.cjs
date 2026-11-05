// Cliente mínimo do MCP do OriginKit (HTTP). Não precisa do MCP registrado: lê a chave da variável de ambiente ORIGINKIT_API_KEY.
//   node scripts/originkit.cjs list            -> índice do catálogo (não gasta cota)
//   node scripts/originkit.cjs search <texto>  -> busca (não gasta cota)
//   node scripts/originkit.cjs get <nome> [pasta]   -> código do componente (GASTA 1 da cota diária: Free = 3/dia)
// Nunca imprime nem grava a chave.
const fs = require('fs'), path = require('path');
const key = process.env.ORIGINKIT_API_KEY, URL_ = 'https://mcp.originkit.dev/mcp';
if (!key) { console.error('ORIGINKIT_API_KEY vazia: adicione no ambiente (Edit → Network secrets / variável) e abra uma sessão NOVA.'); process.exit(1); }
const H = { Authorization: 'Bearer ' + key, 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
const parse = (t) => { t = t.trim(); if (t.startsWith('{')) return JSON.parse(t); const d = t.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).pop(); return JSON.parse(d); };
let sid = null;
async function rpc(method, params, id) {
  const h = { ...H }; if (sid) h['Mcp-Session-Id'] = sid;
  const r = await fetch(URL_, { method: 'POST', headers: h, body: JSON.stringify({ jsonrpc: '2.0', ...(id ? { id } : {}), method, params }) });
  sid = r.headers.get('mcp-session-id') || sid; const t = await r.text(); if (!id) return null;
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${t.slice(0, 300)}`); return parse(t);
}
(async () => {
  const [cmd, a, b] = process.argv.slice(2);
  await rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'kanban-board', version: '1' } }, 1); await rpc('notifications/initialized', {});
  const call = async (name, args) => { const r = await rpc('tools/call', { name, arguments: args }, 2); if (r.error) throw new Error(JSON.stringify(r.error)); return (r.result.content || []).map((c) => c.text || '').join('\n'); };
  if (cmd === 'list') console.log(await call('list_components', {}));
  else if (cmd === 'search' && a) console.log(await call('search', { query: a }));
  else if (cmd === 'get' && a) { const out = await call('get_component', { name: a, stack: 'react', typescript: false }); const f = path.join(b || 'scratch-originkit', a + '.txt'); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, out); console.log('salvo em', f, `(${out.length} caracteres)`); }
  else console.log('uso: list | search <texto> | get <nome> [pasta]');
})().catch((e) => { console.error('erro:', String(e.message).replace(key, '***')); process.exit(1); });
