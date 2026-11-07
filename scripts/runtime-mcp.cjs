#!/usr/bin/env node
// Servidor MCP (stdio, sem dependências) do Runtime: deixa a IA do VS Code/Claude Code criar, listar, mover e comentar tasks.
// Config (ex.: .vscode/mcp.json ou .mcp.json):
//   { "servers": { "runtime": { "command": "node", "args": ["<caminho>/scripts/runtime-mcp.cjs"],
//       "env": { "RUNTIME_API_URL": "https://<ref>.supabase.co/functions/v1/api", "RUNTIME_TOKEN": "kb_..." } } } }
// O token é gerado em Personalizar → Conta → "Acesso por API". Nunca grave o token em arquivo versionado.
const API = process.env.RUNTIME_API_URL, TOKEN = process.env.RUNTIME_TOKEN;
const TOOLS = [
  { name: 'runtime_projects', description: 'Lista os projetos do Runtime que você participa e as colunas de cada um (use antes de criar tasks se não souber os nomes).', inputSchema: { type: 'object', properties: {} } },
  { name: 'runtime_create_task', description: 'Cria uma task no Runtime. Se só há um projeto, "project" pode ser omitido. "column" aceita o nome (ex.: "Em andamento", "Concluído") ou "a fazer"/"andamento"/"concluída". Sem "column" vai para a primeira coluna A fazer.',
    inputSchema: { type: 'object', required: ['title'], properties: { title: { type: 'string' }, description: { type: 'string' }, project: { type: 'string', description: 'nome ou id do projeto' }, column: { type: 'string' }, priority: { type: 'string', enum: ['baixa', 'normal', 'alta', 'urgente'] }, due_date: { type: 'string', description: 'AAAA-MM-DD' }, labels: { type: 'array', items: { type: 'string' } }, notes: { type: 'string', description: 'anotações da task' } } } },
  { name: 'runtime_list_tasks', description: 'Lista tasks recentes de um projeto (opcionalmente de uma coluna).', inputSchema: { type: 'object', properties: { project: { type: 'string' }, column: { type: 'string' }, limit: { type: 'number' } } } },
  { name: 'runtime_get_task', description: 'Lê uma task inteira: descrição, anotações, checklist numerado (n = 1, 2, 3…), etiquetas, responsável, coluna e comentários.', inputSchema: { type: 'object', required: ['task_id'], properties: { task_id: { type: 'number' } } } },
  { name: 'runtime_search', description: 'Busca tasks por texto (título, descrição e anotações) em todos os seus projetos ou em um.', inputSchema: { type: 'object', required: ['query'], properties: { query: { type: 'string' }, project: { type: 'string' }, limit: { type: 'number' } } } },
  { name: 'runtime_update_task', description: 'Edita uma task. Mande só o que muda: title, description, notes, diary (texto do diário de hoje, até 500), priority, due_date (AAAA-MM-DD ou "" para tirar), labels (substitui todas).',
    inputSchema: { type: 'object', required: ['task_id'], properties: { task_id: { type: 'number' }, title: { type: 'string' }, description: { type: 'string' }, notes: { type: 'string' }, diary: { type: 'string', description: 'frase curta do que foi feito, ex.: "Desenvolvendo filtro por prioridade"' }, priority: { type: 'string', enum: ['baixa', 'normal', 'alta', 'urgente'] }, due_date: { type: 'string' }, labels: { type: 'array', items: { type: 'string' } } } } },
  { name: 'runtime_checklist', description: 'Mexe no checklist de uma task (números começam em 1; veja com runtime_get_task). op: add (items = textos; position opcional), check/uncheck/toggle (items = números, ex. [1,3] ou "2-5"), edit (index + text), remove (items), merge (items = 2+ números viram 1 item; text opcional), move (index → position), replace (items = lista nova [{text,done}] ou textos).',
    inputSchema: { type: 'object', required: ['task_id', 'op'], properties: { task_id: { type: 'number' }, op: { type: 'string', enum: ['add', 'check', 'uncheck', 'toggle', 'edit', 'remove', 'merge', 'move', 'replace'] }, items: { description: 'textos (add/replace) ou números (check/uncheck/toggle/remove/merge)' }, index: { type: 'number' }, text: { type: 'string' }, position: { type: 'number' } } } },
  { name: 'runtime_move_task', description: 'Move uma task para outra coluna (ex.: "Concluído" para concluir).', inputSchema: { type: 'object', required: ['task_id', 'column'], properties: { task_id: { type: 'number' }, column: { type: 'string' } } } },
  { name: 'runtime_comment', description: 'Adiciona um comentário em uma task.', inputSchema: { type: 'object', required: ['task_id', 'text'], properties: { task_id: { type: 'number' }, text: { type: 'string' } } } },
];
// Instruções enviadas no initialize: ensinam a IA a gerir o board sozinha e gastando pouco.
const INSTRUCTIONS = [
  'Runtime é o Kanban do usuário. Gerencie o board por ele enquanto trabalha, sem pedir confirmação para o básico.',
  'Fluxo: 1) runtime_projects uma vez por conversa (projetos + colunas); escolha o projeto pelo assunto/repositório. 2) Antes de criar, runtime_search para não duplicar.',
  '3) Task nova: título curto no imperativo (até ~70 caracteres); description com contexto e critério de pronto; passos viram checklist (runtime_checklist op=add), não texto no título; etiquetas curtas; prioridade só se o usuário indicar.',
  '4) "Vamos trabalhar na task X": runtime_get_task, mova para a coluna de andamento (kind doing) e grave diary ("Desenvolvendo …"). Marque itens do checklist conforme termina (op=check).',
  '5) Pronto para revisar: mova para Revisão (se existir). Concluído: mova para a coluna kind done e grave diary com o resultado ("Concluído: …"). Problemas/decisões: runtime_comment.',
  'Economia: não releia a task inteira a cada passo; use runtime_list_tasks com column/limit; só chame runtime_get_task quando precisar da descrição/checklist.',
].join('\n');
const ACTION = { runtime_projects: 'projects', runtime_create_task: 'create_task', runtime_list_tasks: 'list_tasks', runtime_get_task: 'get_task', runtime_search: 'search', runtime_update_task: 'update_task', runtime_checklist: 'checklist', runtime_move_task: 'move_task', runtime_comment: 'comment' };

async function call(name, args) {
  if (!API || !TOKEN) throw new Error('Defina RUNTIME_API_URL e RUNTIME_TOKEN no ambiente do servidor MCP.');
  const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + TOKEN }, body: JSON.stringify({ action: ACTION[name], ...args }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || 'Erro HTTP ' + r.status);
  return j;
}
const send = (o) => process.stdout.write(JSON.stringify(o) + '\n');
async function handle(msg) {
  const { id, method, params } = msg;
  if (id === undefined) return; // notificações (ex.: initialized)
  try {
    if (method === 'initialize') return send({ jsonrpc: '2.0', id, result: { protocolVersion: (params && params.protocolVersion) || '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'runtime', version: '1.1.0' }, instructions: INSTRUCTIONS } });
    if (method === 'tools/list') return send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
    if (method === 'tools/call') {
      try {
        const out = await call(params.name, params.arguments || {});
        return send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] } });
      } catch (e) { return send({ jsonrpc: '2.0', id, result: { isError: true, content: [{ type: 'text', text: String(e.message || e) }] } }); }
    }
    if (method === 'ping') return send({ jsonrpc: '2.0', id, result: {} });
    send({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Método não suportado: ' + method } });
  } catch (e) { send({ jsonrpc: '2.0', id, error: { code: -32603, message: String(e.message || e) } }); }
}
let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; let i; while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (line) { try { handle(JSON.parse(line)); } catch { /* ignora lixo */ } } } });
