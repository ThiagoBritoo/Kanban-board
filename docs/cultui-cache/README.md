# Cache do Cult UI (lido em 05/11/2026)

**O quê:** código-fonte (React + Tailwind + `motion`) dos componentes do registro `@cult-ui` que interessam a um Kanban. Fonte: `https://www.cult-ui.com/r/<nome>.json` (registro público do shadcn; o MCP `shadcn` ainda não tinha subido nesta sessão, então foi por `curl`). Lista completa em `INDICE.md`.

**Em `src/<nome>/`:** kanban-board, timer, dynamic-island, border-beam-button, border-beam-card, halo-button, halo-card, halo-badge, halo-toast, halo-notification, halo-progress, halo-segmented, grid-beam, fluted-glass, rolling-number, direction-aware-tabs, popover-form, expandable, sortable-list, floating-panel.

## Aviso de licença / uso
- Código de terceiros: **é referência**. Não vai para `public/`, não se cola, não se leva dependência (`motion`, `border-beam`, `@paper-design/shaders-react`, `@base-ui/react`…). Recriar o *efeito* com JS/CSS próprio (AGENTS.md, PROCESSO_COMPONENTES.md).
- Confira a licença no repositório/site do Cult UI antes de reutilizar qualquer trecho literalmente em outro projeto.
- Alguns itens (`border-beam-*`, `halo-*` "pro") dependem de pacotes/estilos externos que **não** estão aqui.

## Notas técnicas (o que cada um faz de fato)
- **kanban-board**: HTML5 drag (`draggable`, `dragOver`) + `motion layout`. Entrada do cartão: opacity/y8/scale.97/blur4 com stagger 50 ms; contador da coluna "pula" (scale .6→1); indicador de soltura = barra de 3 px (60% de largura) com gradiente; cartão concluído a 50% de opacidade; tags com cores fixas (azul/vermelho/roxo/verde/âmbar/ciano) a 10% de fundo. Hover: y −2 + sombra.
- **timer**: pílula `role=timer`, `aria-live=polite`, fonte mono tabular; hook `useTimer` (SS.MS, MM:SS, HH:MM:SS); ícone gira só em "loading".
- **dynamic-island**: máquina de estados por *presets* de tamanho (default 150 px … massive 891), mola 400/30, fila de passos com atrasos.
- **halo-button**: três gradientes borrados (`blur-xl`) deslizando em `left` (ciclos 6/5/4 s, ida e volta) na metade de baixo da borda; opacidade ociosa 0,5; tem versão "carregando" com texto escalonado. Borda animada **sempre** (é o que o projeto proíbe: nada pulsando).
- **border-beam-***: pacote npm `border-beam` (feixe de luz percorrendo a borda; `size` sm/md/line; `theme=auto`). Casca `p-px` + raio concêntrico (raio − 1 px).
- **grid-beam**: Canvas 2D, grade com feixes por linha/coluna (velocidade 1 + (i%3)·0,12), paletas por camada, esmaece ao ficar inativo.
- **rolling-number**: `useSpring(massa .8, rigidez 75, amortecimento 15)` + `useTransform` → texto formatado. 43 linhas; o mais simples e portável.
- **direction-aware-tabs**: bolha `layoutId` entre abas + conteúdo entra de ±300 px com blur 4 px conforme a direção; altura animada por `useMeasure`.
- **popover-form**: gatilho vira formulário com `layoutId` (cresce do gatilho), tela de sucesso, fecha com clique fora.
- **expandable**: contexto com `expandDirection` (vertical/horizontal/both) e `expandBehavior` (replace/push); altura/largura medidas e animadas com mola 200/20.
- **sortable-list**: `Reorder.Item` com alça, item marcado não arrasta; mola.
- **fluted-glass**: shader do Paper Design (`@paper-design/shaders-react`) sobre uma imagem: vidro canelado (linhas, distorção, brilho). Só faz sentido com imagem de fundo.
