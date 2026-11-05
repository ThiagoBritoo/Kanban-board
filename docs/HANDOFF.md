# HANDOFF — estado do projeto para a próxima sessão

> Atualizado em 05/11/2026. Serve para **limpar o contexto** e continuar sem perder nada: uma sessão nova lê `AGENTS.md` → este arquivo.
> Não há segredos aqui. A chave `anon` do Supabase é pública por desenho e está em `public/config.js`.

## 1. O que é
Kanban para as tasks da empresa de **Thiago** (e talvez mais 1 pessoa). Login com contas, tempo real, 38 temas (todos claro+escuro), "gerar diário"
(bullets do que foi trabalhado hoje), cronômetro, anexos, vistas Quadro/Lista/Calendário/Painel. Em produção e em uso.
Idioma da interface e das conversas: **português do Brasil**.

## 2. Onde as coisas estão
| O quê | Valor |
|---|---|
| Site em produção | https://kanban-board-kappa-ruby.vercel.app/ |
| GitHub | `ThiagoBritoo/Kanban-board` — branch padrão `main`; branch de trabalho `claude/kanban-tarefas-empresa-7s5zgh` |
| Vercel | projeto `kanban-board` (`prj_4CRK99K4wnUp5s6u4CJm1Xd5q9kD`), time `team_81Icx9qhcrIF6EBaUeEJIgcW`; deploy automático a cada merge na `main`; saída = pasta `public`, sem build |
| Supabase | projeto **`kanban-empresa`** ref `obmbjszdfvwhajgvkfpi` (sa-east-1, org `lhstkmmuoghaiwfpmmdh`). **Não mexer nos outros projetos da conta** (conexao-api, gerenciamento-de-ativos, locativo-teste, o do e-mail, Vantablack-Financas) |
| Migrações aplicadas no Supabase | `0001` esquema+RLS+gatilhos · `0002` trava funções · `0003` checklist/lixeira/comentários/cor de coluna · `0004` limite WIP, cronômetro, anexos (+ bucket privado `attachments`, 10 MB) |
| Contas | a primeira conta criada vira admin; as demais ficam pendentes até aprovação em avatar → Equipe |

## 3. Fluxo de trabalho que o Thiago autorizou
- **Pode mesclar PRs sozinho** neste repositório (disse "pode mesclar, só eu uso, amanhã testo no oficial"). Modo "yolo": construir muita coisa, mas **sempre verificado**.
- Depois de cada merge (squash): `git fetch origin main && git checkout -B claude/kanban-tarefas-empresa-7s5zgh origin/main`. Se o PR der conflito (commit repetido por squash): `git rebase origin/main` e `--force-with-lease`.
- Migrações de banco: **só aditivas** (a produção está em uso). Testar antes num Postgres local ou em transação desfeita (`raise exception` no fim) no projeto real.
- Nunca criar contas de teste no Supabase real (a 1ª conta vira admin).
- Ele pede design de verdade: **abrir a página do componente** nos sites de referência (OriginKit, Cult UI, Skiper UI), ver variantes/controles e recriar o *efeito* com código próprio. Já cobrou isso uma vez.

## 4. Como verificar (obrigatório antes de dar por pronto)
```bash
export SUPABASE_UMD=<caminho>/@supabase/supabase-js/dist/umd/supabase.js   # supabase-js@2.45.4 (npm pack ... e extrair)
node test/e2e.cjs                 # ~63 verificações de interface (API Supabase FALSA em test/fake-supabase.cjs)
node test/shader.cjs <pasta>      # fundo shader (WebGL por software)
node test/terrain.cjs <pasta>     # fundo terreno (Canvas 2D)
node test/themes-check.cjs <pasta># contraste de todos os temas + folha de contato (imagens)
```
Playwright e Chromium já vêm no ambiente de nuvem (`require('playwright')`). Os testes usam API **falsa**: não provam o site real. `package.json` é `"type":"module"`, por isso os testes são `.cjs`.

## 5. Ambiente da sessão (o que aprendemos)
- **Network access = Full** (configurado pelo Thiago). A ferramenta WebFetch continua bloqueada; usar `curl` (HTML estático) ou o Chromium: `node scripts/browse-sites.cjs <pasta> <url>...` (captura + texto; vê SPAs).
- O sistema **bloqueia**: baixar e rodar binários externos; User-Agent disfarçado. Não tentar contornar.
- MCPs úteis: **GitHub** (PRs/merge), **Supabase** (`apply_migration`, `execute_sql`, `get_advisors`), **Vercel** (já autorizado: `list_deployments` com o `teamId` acima).
- `plugin:rls-schema-explorer:supabase` falha na conexão (ignorar).
- Para o Supabase real, **não dá para o ambiente chamar `*.supabase.co` por curl/navegador** em alguns momentos: validar via MCP.

## 5b. OriginKit: como acessar (LEIA antes de abrir componente)
- `originkit.com` dá **503** a partir daqui (não adianta Chromium/curl; não contornar). O **MCP funciona**: `https://mcp.originkit.dev/mcp`.
- Chave: variável de ambiente **`ORIGINKIT_API_KEY`** (o Thiago colocou no ambiente; nunca pedir/colar no chat, nunca gravar em arquivo). Vale só em sessão **nova**.
- Jeito 1: `.mcp.json` do repositório registra o servidor (aprovar quando o Claude Code perguntar). Jeito 2 (sempre funciona): `node scripts/originkit.cjs list|search <texto>|get <nome>`.
- **Cota Free = 3 componentes/dia** (só `get_component`/`fetch` contam; `list_components` e `search` são grátis; 15/hora = pausa de 4 h). Gaste com cuidado.
- Código já baixado (Lightfall, Grid Hole, Ink Flow Field) em `docs/originkit-cache/` — **não gastar cota de novo**; falta baixar Vertical Parallax e Pulsating Border.
- **Os 5 que o Thiago curtiu** (05/11): **Vertical Parallax, Pulsating Border, Lightfall, Grid Hole, Ink Flow Field** — podem ir também em cartões/títulos, não só fundo. Já existe versão **minha** de cada em `public/fx.js` (feita sem ver o original): usar `get` (no máx. 3/dia) para comparar variantes/controles e ajustar. Códigos baixados são referência: recriar com código próprio, não colar licença/dependências de terceiros.

## 6. Arquitetura em 10 linhas
- Site estático em `public/` (JS puro, sem build): `app.js` núcleo e ajustes · `backend.js` camada Supabase (rotas → `supabase-js`) · `views.js` lista/calendário/painel/resumo/atividade/exportar ·
  `palette.js` Ctrl+K · `touch.js` arrastar com o dedo · `island.js` ilha do cronômetro · `shader.js` fundo WebGL · `terrain.js` fundo Canvas 2D · `themes.css` temas · `app.css` componentes.
- Banco: tabelas `profiles, board_columns, tasks, events, attachments`; RLS só para membros **aprovados**; gatilhos geram o histórico (`events`) que alimenta o diário; RPCs `move_task, reorder_column, toggle_timer, add_comment, log_worked, diary, move_column, delete_column`.
- Exclusão de task = lixeira (`deleted_at`), com "Desfazer".
- Preferências por usuário em `profiles.prefs` (jsonb) + `localStorage`; `setPrefs()` aplica na hora e salva com debounce.
- Segurança: `vercel.json` (CSP, X-Frame-Options…). Atenção: se adicionar domínio externo (fonte, script), liberar na CSP.
- PWA: `manifest.webmanifest` + `sw.js` (rede primeiro). **Subir o número de `CACHE` em `sw.js` a cada release** (hoje `kanban-v13`).

## 7. Regras de design (resumo; o completo está em `docs/DESIGN.md`)
Tokens por tema (claro e escuro; `--pop` sempre opaco; `--bw/--font` só no bloco claro) · contraste mínimo 7:1 / 3,5:1 / 4,5:1 (botão) · movimento 150–200 ms, saída mais sutil que a entrada, nada pulsando ·
estrutura: barra lateral com contadores, modal da task em 2 colunas, cartão com rodapé, Personalizar como painel lateral, estados de carregando/vazio/erro/sem conexão.

## 8. Fundos animados (decisão e medidas)
- **Shader** (WebGL, `shader.js`) e **Terreno** (Canvas 2D, `terrain.js`, recriação do *Wire Terrain* do OriginKit com os mesmos controles). Ambos: meia resolução, ~30 fps, pausam com a aba oculta, ficam parados com "fundo animado" desligado / movimento reduzido.
- Medido no sandbox (**sem GPU**, renderização por software, então é pessimista para o WebGL): terreno ≈ 8–12 ms/quadro (CPU, ruído em JS); shader ≈ 34 ms no desktop emulado e ≈ 9 ms no tamanho de celular.
  O terreno é limitado pela CPU; numa GPU real o shader custa quase nada. O terreno tem **qualidade adaptativa** (reduz linhas em aparelho lento). Botão **"Medir desempenho neste aparelho"** em Personalizar → Fundo.
- **Fundos de efeito** (`public/fx.js`, Canvas 2D, teste `test/fx.cjs`): Lightfall, Grid Hole, Ink Flow Field e Parallax vertical (rola o quadro). Pedidos pelo Thiago em 05/11; **recriados do zero a partir do nome** porque o OriginKit estava fora do ar (503) e as páginas originais não foram abertas — reabrir quando voltar e comparar variantes/controles. Em cartões: borda pulsante (opt-in, só prioridade alta/urgente, sem animação com movimento reduzido) e luz caindo no hover (`pulse`, `cardLight`).
- **Lightfall agora é WebGL** (shader próprio em `fx.js`: faixas de luz na parede curva de um cilindro, cabeça/cauda, cintilar, brilho de fundo; reserva em Canvas 2D se não houver WebGL). Feito vendo o original em `docs/originkit-cache/`. **Falta** refazer Grid Hole e Ink Flow Field (o original do Ink é simulação de fluido WebGL; o Grid Hole original é Canvas 2D com discos+linhas+partículas) e abrir Parallax e Pulsating Border (cota).
- **Temas com fundo automático** (como Topografia, mas via `fx.js`): Chuva de luz (lightfall), Singularidade (grid hole), Nanquim (ink flow), Cordilheira (parallax); paleta claro/escuro no mapa `AUTO` de `fx.js` + tokens em `themes.css`. Total: 38 temas.
- Ideia pendente: versão **WebGL** do terreno ("qualidade alta": malha mais densa, brilho), com o Canvas 2D como reserva.

## 9. Pendências e ideias
- Confirmar com o Thiago (não sei se já fez): Supabase → Authentication → **URL Configuration** (Site URL = endereço da Vercel), decidir **Confirm email**, e **Leaked password protection** (pode exigir plano pago).
- Ele quer **mais componentes** dos sites de referência. Fila do OriginKit (ver `docs/REFERENCIAS_DESIGN.md`; já feitos: Wire Terrain, Lightfall, Grid Hole, Ink Flow, Parallax, Pulsating Border): Accretion Disc, Acrylic Pour, Wave Ribbons, Wind Pyre, Wire Throat, Wireframe Globe, Twisting Vortex, Wobbling Lattice Sphere… Perguntar quais ele curte; abrir cada um e recriar.
- Cult UI e Skiper UI: componentes ainda **não abertos** (só as homes).
- Candidatos de produto: notificações push reais, tarefas recorrentes, vários quadros/projetos, integração de e-mail.
- Refero: estilos ainda não transformados em tema (Warp, Prisma, Vercel, Perplexity, Brex, Freitag, B&O, Reflect…).
- Primeira abertura **real** das versões novas no site de produção ainda não foi vista por mim (só por testes com API falsa e capturas).

## 10. Mapa de documentos
`AGENTS.md` (entrada; `CLAUDE.md` só importa ele) · `docs/HANDOFF.md` (este) · `docs/DESIGN.md` (design system) · `docs/REFERENCIAS_DESIGN.md` (referências, o que foi aplicado de cada, como a IA vê sites) · `README.md` (uso) · `supabase/migrations/` · `test/` · `scripts/browse-sites.cjs`.
