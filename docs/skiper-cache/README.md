# Cache do Skiper UI (lido em 05/11/2026)

**O quê:** código dos componentes **gratuitos** do Skiper UI (`https://skiper-ui.com/r/<skiperN>.json`, registro público do shadcn; `npx shadcn add @skiper-ui/skiperN`). Catálogo: https://skiper-ui.com/components (106 componentes, **37 grátis**, 69 Pro).
Em `src/`: skiper37 (Animated number, 4 variantes), 101 (Custom tooltip), 106 (Smooth caret input), 4 e 26 (Theme toggle), 58 (Text roll navigation), 52/53 (ExpandOnHover), 41 (Progressive blur), 87 (Scroll with fade), 89 (Scroll progress), 64 (Gooey effect).

## Pagos (só descritos; não foram acessados)
Pro ($129 pago uma vez; Exclusive $549). Entre eles, os que seriam úteis aqui: **Dynamic island (skiper2)**, Things drag and scroll (5), Tik tik color list (24), Expandable tabs navigation (96), Animated number input (68), Skiper Number flow (69), Auto Scale input (105), Rolling text (27), Animated icons 001 (42). Nada foi baixado nem contornado.

## Aviso de licença / uso
- Referência. Não copiar para `public/`; recriar o efeito com código próprio. Dependências externas (`framer-motion`, `@number-flow/react`, `dialkit`, `@radix-ui/react-tooltip`) **não** entram no projeto.
- Os termos do site (FAQ "uso comercial") devem ser lidos antes de reutilizar literalmente em outro projeto.
- Os componentes trazem cores fixas (ex.: fundo `#f5f4f3`) — no Kanban tudo deve vir dos tokens do tema.

## Notas técnicas
- **skiper37**: usa `@number-flow/react` (`<NumberFlow value prefix/>`), dígitos que rolam individualmente; variantes: contagem regressiva, contador +/−, etc.
- **skiper41 Progressive blur**: `div` de 150 px com `backdrop-filter: blur(4px)` + `mask-image` linear → desfoque que cresce em direção à borda. CSS puro, trivial de recriar.
- **skiper106 Smooth caret**: cursor próprio em `motion.div` que desliza (mola) até a posição medida do texto num `<input>`; usa `dialkit` só para painel de ajuste.
- **skiper101 Tooltip**: Radix Tooltip com seta que herda a borda.
- **skiper52 ExpandOnHover**: faixas que expandem de 5 rem para 24 rem no hover (300 ms).
- **skiper87**: ScrollArea com fade nas pontas.
- **skiper89**: barra de progresso de rolagem + número.
