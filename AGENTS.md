# Kanban da empresa — contexto do projeto

> Este é o arquivo de instruções para qualquer agente de IA (padrão `AGENTS.md`). O `CLAUDE.md` só importa este arquivo.

Estado atual do projeto, IDs, fluxo de trabalho e pendências: @docs/HANDOFF.md (leia primeiro numa sessão nova).
Antes de mudar qualquer interface, leia @docs/DESIGN.md (tokens, movimento, anti-slop, checklist de entrega).
Ao trazer **qualquer componente/efeito de biblioteca de referência**, siga @docs/PROCESSO_COMPONENTES.md (acesso, cota, cache, recriação, verificação). Fontes: `docs/REFERENCIAS_DESIGN.md`.
Use cores, tipografia e espaçamento do design system; derive campos, textos e estados deste projeto, não de memória.

## Como o projeto funciona
- Site estático em `public/` (HTML/CSS/JS puro, sem build) + Supabase (login, banco com RLS, tempo real, storage). Deploy: Vercel a cada merge na `main`.
- Banco: `supabase/migrations/` (rodar em ordem). Só migrações **aditivas**; nunca quebrar o que já está em produção.
- Temas: `public/themes.css` (cada tema tem claro e escuro). Núcleo: `public/app.js`; vistas: `views.js`; fundo WebGL: `shader.js`, `terrain.js` (fundo Canvas 2D).

## Como verificar (obrigatório antes de dar por pronto)
```bash
npm i --no-save @supabase/supabase-js@2.45.4   # uma vez. NÃO instale playwright na nuvem: já vem com Chromium (instalar outra versão quebra; se instalou: rm -rf node_modules/playwright*)
SUPABASE_UMD=node_modules/@supabase/supabase-js/dist/umd/supabase.js node test/e2e.cjs        # interface (API Supabase falsa)
SUPABASE_UMD=... node test/shader.cjs                                                          # fundo shader (WebGL por software)
SUPABASE_UMD=... node test/fx.cjs /tmp/capturas                                                # fundos de efeito (WebGL ativo, claro/escuro, celular)
SUPABASE_UMD=... node test/themes-check.cjs /tmp/capturas                                      # contraste + folha de contato dos temas
```
Olhe as capturas (claro e escuro, desktop e celular). O teste usa uma API falsa: não substitui conferir o site publicado.

## Regras que já custaram caro
- Não confie só em código: abra a tela (Playwright) e olhe.
- Contraste mínimo: texto/pop 7:1, apoio 3,5:1, texto do botão sobre o acento 4,5:1 — nos dois modos.
- Sem animações pulsando; saídas mais sutis que as entradas; respeitar `prefers-reduced-motion`.
- Ao usar biblioteca de componentes (OriginKit, Cult UI, Skiper UI) abra o **original** (MCP/script/registro; variantes e controles), não só a home, e reproduza o *efeito* com código próprio. Recriar "pelo nome" já errou (Grid Hole, Lightfall, Ink Flow).
- Não disfarçar User-Agent nem contornar proteção de site ao pesquisar referências (use `scripts/browse-sites.cjs`).

## Design com referências: processo obrigatório (resumo; completo em `docs/PROCESSO_COMPONENTES.md`)
1. **Cache primeiro**: ler `docs/originkit-cache/` antes de gastar cota. OriginKit Free = 3 `get`/dia (`list`/`search` grátis): `search` → escolher ≤3 → `get` → **salvar no cache na hora** e registrar no HANDOFF o que falta.
2. **Acesso**: MCP (`.mcp.json`) → `node scripts/originkit.cjs` → `curl https://www.cult-ui.com/r/<nome>.json` → Chromium só para ver. Chaves só em variável de ambiente (nunca no chat/arquivo). Sem disfarçar UA nem contornar proteção. MCP novo só em **sessão nova**.
3. **Ler o original** (técnica, estrutura, parâmetros, entradas) **antes** de escrever; recriar com **código próprio**, sem colar código/licença/dependência de terceiros, poucos controles (cores, velocidade, intensidade).
4. **Sempre**: claro **e** escuro (escuro aditivo, claro por mistura), reserva em Canvas 2D se usar WebGL, meia resolução, pausa com aba oculta, `prefers-reduced-motion` com quadro já "desenvolvido".
5. **Verificar de verdade**: `test/fx.cjs` (WebGL ativo, move, custo, celular, sem erros) + olhar as capturas; depois conferir o site publicado.
6. **Entregar**: subir `CACHE` em `sw.js`, atualizar `docs/HANDOFF.md`, PR → merge (autorizado no HANDOFF), realinhar a branch com `--force-with-lease`. Melhorou o processo? Atualize `PROCESSO_COMPONENTES.md` na mesma sessão.

## Gestão da context window (economizar token)
- Sessão nova começa lendo só `AGENTS.md` → `docs/HANDOFF.md`. Não releia o repositório inteiro: abra apenas os arquivos que a tarefa toca (use `Read` com `offset/limit` e `Grep` em vez de ler arquivos grandes como `app.js` por completo).
- Não cole saídas longas (logs, HTML de sites, listas) na conversa: grave em arquivo no scratchpad e leia só o trecho necessário. Testes: mostre só o resumo/falhas.
- Uma tarefa por sessão. Ao terminar e mesclar, **atualize `docs/HANDOFF.md`** e sugira abrir sessão nova (`/clear`); não arraste conversa antiga.
- Use `/compact` com foco quando precisar continuar na mesma sessão. Não gere subagentes nem pesquisas amplas sem necessidade.
- Responda curto: sem recapitular o que já foi feito, sem repetir código que está no repositório.
- Em tarefa longa, registre decisões e pendências no `HANDOFF.md` em vez de depender da memória da conversa.
