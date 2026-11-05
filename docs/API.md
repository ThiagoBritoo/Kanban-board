# API do Runtime (criar tasks de fora: IA no VS Code, scripts…)

1. **Aplicar** `supabase/migrations/0005` e `0006` e **publicar** a função `supabase/functions/api` (verify_jwt desligado: a autenticação é o token).
2. No app: **Personalizar → Conta → Acesso por API → Gerar token**. O token (`kb_…`) aparece **uma vez**; só o hash fica no banco. Revogue quando quiser.
3. Use com `curl`:
   ```bash
   curl -s -X POST "https://<ref>.supabase.co/functions/v1/api" \
     -H "authorization: Bearer $RUNTIME_TOKEN" -H "content-type: application/json" \
     -d '{"action":"create_task","project":"Locativo","column":"Em andamento","title":"Corrigir despesas","labels":["bug"],"priority":"alta"}'
   ```
   Ações: `projects`, `create_task`, `list_tasks`, `move_task`, `comment`.
4. **MCP (VS Code / Claude Code)**: aponte para `scripts/runtime-mcp.cjs` (Node 18+, sem dependências):
   ```json
   { "servers": { "runtime": { "command": "node", "args": ["C:/caminho/scripts/runtime-mcp.cjs"],
       "env": { "RUNTIME_API_URL": "https://<ref>.supabase.co/functions/v1/api", "RUNTIME_TOKEN": "kb_..." } } } }
   ```
   Depois é só pedir à IA: "cria no Runtime a task 'consertar despesas' em Em andamento" / "marca a task 42 como concluída".
Segurança: a função só escreve por `api_create_task`/`api_move_task`/`api_comment`, que exigem que a pessoa do token seja **membro do projeto**; tudo fica registrado em nome dela.
