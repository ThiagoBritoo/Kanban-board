# API do Runtime (criar tasks de fora: IA no VS Code, scripts…)

1. **Aplicar** `supabase/migrations/0005`, `0006` e `0009` (editar task pela API) e **publicar** a função `supabase/functions/api` (verify_jwt desligado: a autenticação é o token).
2. No app: **Personalizar → Conta → Acesso por API → Gerar token**. O token (`kb_…`) aparece **uma vez**; só o hash fica no banco. Revogue quando quiser.
3. Use com `curl`:
   ```bash
   curl -s -X POST "https://<ref>.supabase.co/functions/v1/api" \
     -H "authorization: Bearer $RUNTIME_TOKEN" -H "content-type: application/json" \
     -d '{"action":"create_task","project":"Locativo","column":"Em andamento","title":"Corrigir despesas","labels":["bug"],"priority":"alta"}'
   ```
   Ações: `projects`, `create_task`, `list_tasks` (com checklist feito/total), `get_task` (descrição, anotações, diário, checklist numerado, comentários),
   `search` (`query`), `update_task` (title, description, notes, diary, priority, due_date, labels), `checklist`, `move_task`, `comment`.
   `checklist` usa números a partir de 1: `{"action":"checklist","task_id":41,"op":"check","items":"2-4"}`. Ops: `add` (items = textos, `position` opcional),
   `check`/`uncheck`/`toggle`/`remove` (items = `[1,3]`, `"1,3"` ou `"2-4"`), `edit` (index + text), `merge` (2+ itens viram um), `move` (index → position), `replace`.
4. **MCP (VS Code / Claude Code)**: aponte para `scripts/runtime-mcp.cjs` (Node 18+, sem dependências):
   ```json
   { "servers": { "runtime": { "command": "node", "args": ["C:/caminho/scripts/runtime-mcp.cjs"],
       "env": { "RUNTIME_API_URL": "https://<ref>.supabase.co/functions/v1/api", "RUNTIME_TOKEN": "kb_..." } } } }
   ```
   Depois é só pedir à IA: "cria no Runtime a task 'consertar despesas' em Em andamento" / "marca a task 42 como concluída".
O servidor MCP manda **instruções** no `initialize` (achar o projeto, buscar antes de criar, passos viram checklist, mover para andamento/revisão/concluído e gravar o diário) e gasta pouco: só lê a task inteira quando precisa.
Segurança: a função só escreve por `api_create_task`/`api_move_task`/`api_comment`/`api_update_task`, que exigem que a pessoa do token seja **membro do projeto**; tudo fica registrado em nome dela.
