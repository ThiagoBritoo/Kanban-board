# DESIGN.md — Kanban da empresa

Design system **master** (padrão "Master + Overrides" do UI UX Pro Max). Mudanças específicas de tela/tema entram como *override*
em `public/themes.css`; o que é regra geral fica aqui. Origem das ideias: `docs/REFERENCIAS_DESIGN.md`.

## 1. Princípios
1. **Trabalho primeiro.** É uma ferramenta de uso diário: nada decorativo atrapalha ler, arrastar ou digitar. Efeitos vivem no *fundo*, nunca no conteúdo.
2. **Tudo é token.** Componentes só leem variáveis CSS; trocar de tema/modo não exige tocar em componente.
3. **Toda aparência tem claro e escuro**, e o contraste é conferido por script (texto/pop ≥ 7:1, apoio ≥ 3,5:1, botão de destaque ≥ 4,5:1).
4. **Personalização em camadas:** tema → modo → cor de destaque → fonte → cantos → densidade → cartões/bordas/sombras/tamanho → fundo (gradiente, imagem, shader) → efeitos (liga/desliga, velocidade, intensidade).
5. **Movimento com critério** (seção 3). Respeita `prefers-reduced-motion` e a chave "animações da interface".

## 2. Tokens (por tema, claro e escuro)
`--bg --surface --col --card --pop --line --text --muted --accent --accent-fg --shadow --shadow-hover --hl --radius-t --bw --blur --font --font-h --heading-weight --heading-track --fs --fw`
e, para fundos: `--d1 --d2 --d3 --grid --grid2 --dots --star`. `--pop` é **sempre opaco** (modais, popovers e checagem de contraste).
Overrides do usuário têm especificidade maior que o tema (`html[data-x][data-theme]`, cor de destaque inline em `html`).

## 3. Movimento
- Hover/estado: 150–200 ms. Entrada de modal/popover/ilha: ≤ 200 ms; **saída mais sutil** (modal 120 ms, popover 90 ms).
- Curva `--ease: cubic-bezier(.23,1,.32,1)`. Sem `ease` puro, sem bounce em ações utilitárias, nunca partir de `scale(0)`.
- Press: `scale(.97)`. Popover cresce do gatilho. Trocas de ícone: opacity + scale + blur.
- Animar só `transform`/`opacity`. Efeitos de fundo: um loop leve, pausa com a aba oculta.
- **Nunca:** indicador pulsando, stagger em listas utilitárias, animar conteúdo estático, animar ações de teclado.

## 4. Anti-slop (regras deste projeto)
- Faixa colorida à esquerda do card = **só prioridade alta/urgente**.
- Contêineres: no máximo 2 níveis (coluna → card). Chips e tags não viram caixas dentro de caixas.
- Sem acento ciano/teal "padrão": cada tema define o próprio acento.
- Fonte: não confiar só em Inter; cada tema escolhe títulos (Fraunces, Orbitron, Garamond, Space Grotesk, Nunito…) quando combina com o caráter.
- Ícones em um único traço (24px, stroke 2); sem emoji como ícone.

## 4b. Estrutura da interface (aprendida vendo as referências)
- **Navegação:** topo enxuto (busca, vistas, ações) + **barra lateral** com filtros, prazos, equipe e etiquetas **com contadores** (OriginKit). Em telas estreitas a barra vira uma linha de chips rolável.
- **Cartão:** conteúdo → linha fina → rodapé (rótulos à esquerda; indicadores e dono à direita). Rodapé some se estiver vazio (Cult UI).
- **Detalhe da task:** duas colunas — conteúdo à esquerda (descrição, checklist, anexos, comentários) e **propriedades à direita**; no celular as propriedades vão para o topo, compactas.
- **Configurações:** painel lateral que **não escurece o quadro** (mudanças ao vivo, como os controles do Shader Gradient), agrupadas (Tema · Cores · Fundo · Cartões · Geral), com "salvo automaticamente" e **Restaurar padrões com desfazer** (Refero: settings).
- **Estados:** sempre carregando (esqueleto), vazio (com a próxima ação), erro (com "tentar de novo") e sem conexão (faixa).
- **Entrada:** tela de login com hero tipográfico sobre gradiente, sem controles de tema (Skiper).

## 5. Como criar um tema novo
1. Escolha a família/inspiração (`docs/REFERENCIAS_DESIGN.md` §5) e, se possível, **leia o estilo real** (Refero) em vez de lembrar.
2. Duas linhas em `themes.css`: `[data-theme="x"]{…claro…}` e `[data-theme="x"][data-mode="dark"]{…escuro…}`. `--bw`, `--font`, `--pad` só no bloco claro.
3. Se tiver efeito de fundo: use `#deco::before/::after` ou `.d1 .d2 .d3`, **sempre** com `calc(Ns / var(--fx-speed,1))` e respeitando `data-fx="off"`.
4. Registre em `THEMES` (`app.js`): `[id, nome, descrição, categoria, animado?]`.
5. Rode `node test/themes-check.cjs <pasta>`: contraste + folha de contato. Olhe a folha: o tema se distingue dos vizinhos?

## 6. Checklist de entrega (taste: aterrar, verificar, não exagerar)
- [ ] Olhei o artefato real (a página/estilo/tela), não só a memória?
- [ ] Contraste ok nos dois modos? (`test/themes-check.cjs`)
- [ ] Testes de interface passam? (`test/e2e.cjs`, e `test/shader.cjs` se mexeu no fundo)
- [ ] Vi a captura (claro e escuro, desktop e celular) e não só o código?
- [ ] Hierarquia primeiro: dá para dizer em 3 segundos para que serve a tela? Títulos longos, botões apertados e cartões grandes não quebram no celular?
- [ ] Tem estados de carregando, vazio e erro?
- [ ] Animações respeitam reduzir movimento e têm saída mais sutil que a entrada?
- [ ] O que eu adicionei é o que a ocasião pede? (cortar o resto)

## 7. Mapa de arquivos
`public/themes.css` temas e fundos · `public/app.css` componentes · `public/app.js` núcleo/ajustes · `public/views.js` lista, calendário, painel, resumo ·
`public/shader.js` fundo WebGL · `public/island.js` ilha do cronômetro · `public/palette.js` Ctrl+K · `public/touch.js` arrastar com o dedo · `public/backend.js` Supabase.
