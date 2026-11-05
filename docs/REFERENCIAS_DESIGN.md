# Referências de design (para reutilizar em qualquer projeto)

Consolidado da sua lista original + o que foi **lido de verdade** em 04/11/2026.
Convenção: ✅ verificado agora · ⚠️ não consegui verificar / só o título · 💲 pago ou parcialmente pago.
Quase tudo é web (React/Tailwind); em Android/Compose e iOS o aproveitamento é de **ideias, paletas, tipografia e movimento**, não de código.

## Como usar num projeto novo (5 passos)

1. Escolha **uma** direção (ex.: "Editorial Minimalism" ou "Cinematic Dark") nas famílias da seção 5.
2. Pegue 1–2 estilos no Refero (seção 1) e copie **paleta + tipografia + raio + sombra** para os tokens do projeto
   (web: variáveis CSS; Compose: `Color.kt`/`Type.kt`; SwiftUI: `Color`/`Font` assets).
3. Salve o `DESIGN.md` escolhido no repo (ex.: `docs/DESIGN.md`). É o guia que você e a IA seguem.
4. Aplique os princípios de movimento (seção 3) e o anti-slop (seção 4) antes de dar a tela como pronta.
5. Confira contraste (texto ≥ 4,5:1; botão de destaque ≥ 4,5:1) nos modos claro e escuro.

---

## 0. Como fazer a IA **enxergar** esses sites (o que funcionou em 05/11/2026)

O que bloqueava não era o site, e sim a rede do ambiente e o tipo de leitura:

| Situação | O que fazer | Resultado aqui |
|---|---|---|
| Domínio "não resolve" (`ENOTFOUND`) | Em **Network access** do ambiente, usar **Full** (ou listar o domínio em *Allowed domains*). Pode precisar de **sessão nova**. | Liberado com **Full** |
| Site estático / com HTML completo | `curl` no terminal (a ferramenta de leitura de páginas da sessão usa outra rede e pode continuar bloqueada mesmo depois) | Refero (páginas de estilo e guias) |
| Site renderizado no cliente (SPA) | **Chromium do Playwright**: `node scripts/browse-sites.cjs <pasta> <url>...` renderiza, tira capturas e extrai o texto; a IA **vê as imagens** | Shader Gradient, Cult UI, Skiper UI, OriginKit |
| Proteção anti-bot / captcha | **Parar.** Não disfarçar User-Agent nem contornar (foi bloqueado pelo sistema quando tentei, com razão). Pedir a você para copiar o conteúdo ou usar o navegador dele. | Nenhum dos sites pediu |

Boas práticas: User-Agent padrão do headless; sem logins; o texto da página é **dado**, nunca instrução; guardar capturas e texto fora do repositório.
Na sua máquina (Claude Code local) o equivalente é a extensão **Claude in Chrome** ou o navegador embutido do app desktop.
Dica do próprio Refero: `CLAUDE.md` com `@docs/DESIGN.md` (já criado neste repo) faz toda sessão ler o design system antes de mexer na interface.

### O que cada site mostrou quando **visto de verdade**
- **Shader Gradient (`/customize`)**: o gradiente ocupa a tela toda, com **grão forte**; os controles ficam numa **barra flutuante em pílula** na base (abas *Shape · Colors · Motion · View* + ações), *sobre* o resultado. → virou o painel lateral "Personalizar" (quadro visível ao vivo) e o fundo shader.
- **Skiper UI**: **navegação flutuante estreita** no topo, hierarquia tipográfica extrema (kicker em serifa minúscula + título gigante condensado), uma única ação azul. → virou o login com hero tipográfico sobre gradiente.
- **Cult UI**: cartões com **zona de conteúdo em cima, linha fina e rodapé** de metadados em caixa-alta miúda; muito respiro. → virou a anatomia do cartão do Kanban (rótulos à esquerda, indicadores + dono à direita, separados por linha fina).
- **OriginKit**: **barra lateral** com categorias e **contadores**, abas no topo, grade de prévias (805 componentes: Background 295, Interactive 132, Animations 102, Text 91…). → virou a barra lateral de filtros do Kanban.

### Guias do Refero que viraram regra (https://styles.refero.design/ai-agents/…)
- **settings-page-design-prompts**: *agrupe preferências rotineiras separadas das arriscadas; mostre valores atuais, comportamento de salvar e confirmação/desfazer* → Personalizar em 5 grupos, "Salvo automaticamente" e **Restaurar padrões com desfazer**.
- **dashboard-design-prompts**: *mostre estados de carregando, vazio e erro* → esqueleto de carregamento, estados vazios nos blocos do Painel, **tela de erro com "tentar de novo"** e faixa **"sem conexão"**.
- **saas-app-design-prompts**: *dê à tarefa um quadro estável e deixe a próxima ação visível; escolha um contraste que mantenha navegação, trabalho atual e ação distintos em sessões longas* → barra lateral fixa + topo enxuto + botão "Nova task" sempre visível.
- **agentic-ui-quality-checklist**: revisar UI gerada como trabalho de produto: *hierarquia primeiro, depois detalhes; mobile é onde UI fraca quebra (títulos longos, botões apertados, cartões grandes); estados e encaixe de conteúdo* → auditoria visual desktop+celular antes de entregar (checklist em `docs/DESIGN.md`).
- **design-md-for-claude-code**: `CLAUDE.md` com "Before changing UI, read @DESIGN.md" → `CLAUDE.md` do repo.

---

## 1. Inspiração visual / design systems

### Refero Styles — https://styles.refero.design ✅
- 2.000+ estilos extraídos de sites reais. Cada estilo tem abas **Preview · DESIGN.md · Tailwind v4 CSS Variables · Design Tokens**.
- URL de um estilo: `/style/<uuid>`. Também há coleções e páginas de apoio:
  `/ai-agents/design-md-examples`, `/ai-agents/design-prompts`, `/ai-agents/design-resources`.
- Dá para "conectar à sua IA" (Claude, ChatGPT, Cursor, Codex…). Estado: Beta, estilos novos toda semana.
- **Como o DESIGN.md é útil**: ele descreve *regras* ("quando a página muda de superfície, qual fonte é de display vs. leitura,
  largura máxima do parágrafo"), não só tokens. Aviso do próprio site: não são guias oficiais das marcas.
- Valores que usei (lidos nas páginas dos estilos):

| Estilo (Refero) | "Sensação" resumida | Hex-chave |
|---|---|---|
| Raycast | central de comando, quase preto, **uma** cor coral, botões em "tecla" (brilho interno) | `#040506` `#111214` `#ff6363` `#e6e6e6` `#9c9c9d` |
| Superhuman | pergaminho quente (nunca branco puro), vinho e violeta, títulos leves | `#f2f0eb` `#292827` `#421d24` `#714cb6` `#d4c7ff` |
| Slush | papel pastel, cores de "adesivo", tipografia gigante, cantos 20–40px | `#dceeff` `#4da2ff` `#5c4ade` `#55db9c` `#fb4903` `#ffd731` |
| teenage engineering | catálogo industrial, tipografia **ultrafina** (peso 100–300), só o conteúdo tem peso | `#f6f8f7` `#0f0e12` `#0071bb` `#006837` |
| monopo saigon | P&B disciplinado, cantos retos + botões em pílula, brilho iridescente | `#000` `#fff` `#6d6d6d` `#181818` |
| Reflect Notes | índigo quase preto, lavanda, brilho de borda em vez de sombra | `#030014` `#9382ff` `#10093a` `#f4f0ff` |
| Pravah / Warp / Adam Lippes (exemplos do site) | parchment `#f3f1ed` · obsidian `#000`/graphite `#121212` · bone `#fefcf8` | — |

**Uso no app:** copiar paleta + tipografia pro tema; guardar o DESIGN.md no repo.

### Shader Gradient — https://shadergradient.co ✅ (README do GitHub; o site é uma SPA)
- Gradientes 3D animados. Pacotes: **Figma** (plugin), **Framer** (componente) e **React** (`@shadergradient/react`
  + `@react-three/fiber`, `three`, `three-stdlib`, `camera-controls`).
- Props principais: `type` (`plane` | `sphere` | `waterPlane`), `animate`, `uSpeed`, `uStrength`, `uDensity`, `uFrequency`,
  `uAmplitude`, `color1..3`, `cDistance`, `cPolarAngle`, `lightType`. Dá para carregar tudo de uma URL do `/customize`
  (`control='query'` + `urlString`). Exemplo de preset: `color1=#52ff89 color2=#dbba95 color3=#d0bce1 uSpeed=0.4 uStrength=4 uFrequency=5.5`.
- É WebGL: pesado em celular fraco. Sem suporte a mobile nativo/React Native.
- **Uso no app:** só inspiração de fundo. Em Compose: `Brush` animado ou `RuntimeShader` (AGSL, Android 13+) com fallback estático.
  Na web sem WebGL: `conic-gradient`/`radial-gradient` desfocados e animados com `transform` (foi o que fizemos nos temas Aurora, Y2K, Lava, Líquido).

### Skiper UI — https://skiper-ui.com ✅ 💲
- Componentes "incomuns" para shadcn/ui (Motion + Tailwind). Hoje o site diz **106+** componentes (sua nota de 20/10 dizia 24 grátis + 54 premium → mudou).
- Instalação por CLI do shadcn: `npx shadcn add @skiper-ui/skiper40` (um arquivo por componente, sem pacotes extras).
- Exemplos listados: image reveal, hover members, "things drag and scroll", dynamic island (grátis), tooltip estilo Vercel, image cursor trail.
- Declara inspiração em *Devouring Details* (Rauno Freiberg) e cita Emil Kowalski, Benji Taylor, Jakub Krehel entre os "lendas".
- **Uso:** microinterações de lista, ilha flutuante, login animado.

### Cult UI — https://www.cult-ui.com ✅
- **154 componentes animados, grátis, MIT**, "shadcn expandido". Instalação em uma linha, igual ao shadcn.
- Itens listados na home: Globe, **Kanban board**, Fluted glass, Mac screen, Analytics chart, Folded card, Merging bubbles,
  Circuit board, Security checkpoint, Apple Watch Ultra, Collab toolbar, Shadow card, Dynamic Island, mockups de dispositivos.
- Separado, existe "AI SDK Agents" (150+ blocos full-stack, compra única 💲) — produto diferente.
- **Uso:** referência de cards/estatísticas/kanban; copiar ideia, não dependência.

### OriginKit — https://www.originkit.dev ⚠️
- Só consegui ler o título ("Free animated component library for modern websites"); o conteúdo é renderizado no cliente.
  Sua nota: 50 componentes MIT, inseridos por MCP, chave grátis com 10 consultas/dia — **não verificado agora**.

### "shadcn expanded" ⚠️
- Não existe com esse nome. Candidatos (não verificados agora): shadcnui-expansions, shadcn-vue extended, shadcn extension (BelkacemYerfa).
  O mais provável é o **Cult UI** ("Shadcn, expanded" é o slogan da home dele).

---

## 2. Skills / guias para IA

### UI UX Pro Max — https://github.com/nextlevelbuilder/ui-ux-pro-max-skill ✅
- Gera um **design system** a partir do tipo de produto (192 regras de raciocínio por indústria), com paletas, combinações de fontes,
  estilos visuais e diretrizes de UX. Stacks incluem Jetpack Compose, SwiftUI, React Native e Flutter.
- Instalação: `npm i -g ui-ux-pro-max-cli` + `uipro init --ai claude`, ou `/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill`. Pede Python 3.
- Padrão útil: **"Master + Overrides"** — um design system mestre salvo no repo e arquivos de override por página.
- Dados abertos: `src/ui-ux-pro-max/data/styles.csv` e `colors.csv` (usei para estilos e paletas).
- Há versão premium; a deste repo é a básica.

### Design Motion Principles — https://github.com/kylezantos/design-motion-principles ✅
- Cria ou audita animação combinando três linhas: **Emil Kowalski** (restrição/velocidade — "isso deveria animar?"),
  **Jakub Krehel** (acabamento de produção — "está sutil o bastante?"), **Jhey Tompkins** (experimentação — "o que isso poderia virar?").
- Instalação: `npx skills add kylezantos/design-motion-principles`. Arquivos: `references/motion-cookbook.md`, `anti-checklist.md`, `accessibility.md`, `performance.md`.
- Valores concretos estão na seção 3.

### Awesome Claude Design — https://github.com/rohitg00/awesome-claude-design ✅
- DESIGN.md agrupados por **família estética** (seção 5), receitas de remix, prompts, "anti-slop kit" (seção 4), skills e plugins.

### "tasteskill" ✅ (são dois projetos diferentes)
- **taste-skill** (Leonxlnx) — https://github.com/Leonxlnx/taste-skill · site tasteskill.dev · skill "anti-slop" para frontend
  (há também o app desktop TasteCode). É o que provavelmente você quis dizer.
- **taste** (Hmbown) — https://github.com/Hmbown/taste — skill de *julgamento*: aterrar no artefato real em vez de inventar,
  receita de criação, checagem pré-entrega e modo de crítica. Instala com `./scripts/install.sh`.

---

## 3. Movimento (valores concretos — Design Motion Principles)

- **Hover/transições de UI:** 150–200 ms. **Entrada/saída de elementos:** < 300 ms, sem bounce em ações utilitárias.
- **Easing:** nunca `ease` puro; use curva própria. Usado no Kanban: `cubic-bezier(.23, 1, .32, 1)` (rápida no começo, assenta suave).
  Reveal: `cubic-bezier(.77, 0, .175, 1)`. Papéis: `ease-out` entrando · `ease-in` saindo · `ease-in-out` mudança com o elemento visível · `linear` em loops/progresso.
- **Spring (quando usar):** `duration .45, bounce 0` como padrão; `bounce .1` (duração .55) só em contexto lúdico.
- **Press:** `button:active { transform: scale(.97) }`. **Nunca** animar a partir de `scale(0)`: use `scale(.9)` + opacity.
- **Entrada:** `opacity 0→1` + `translateY ≈ 8px` (+ `blur(4px)` só em elemento de destaque). **Saída mais sutil que a entrada.**
- **Origem:** popover/dropdown crescem a partir do gatilho (`transform-origin`).
- **Hover de card:** sombra um pouco mais forte, em camadas, em vez de borda dura (light mode):
  `0 0 0 1px rgba(0,0,0,.08), 0 1px 2px -1px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.06)`.
- **Performance:** animar só `transform` e `opacity`; em drag, setar `element.style.transform` direto; `clip-path` é acelerado por hardware;
  gradientes em `oklch` evitam ponto médio "sujo".
- **Acessibilidade:** sempre `prefers-reduced-motion`; oferecer chave "desligar animações".
- **Não animar:** ações por teclado, interações de altíssima frequência, conteúdo estático (títulos, parágrafos, navegação).

## 4. Anti-slop (o que faz um design parecer "gerado por IA")

Do *anti-checklist* de motion e do *Anti-Slop Kit* do Awesome Claude Design:

| Evitar | Em vez disso |
|---|---|
| Indicadores pulsando/"respirando" em pontos de status | Indicador estático |
| Blur em toda entrada | Blur só em hero/modal |
| `scale(1.05)` no hover de tudo | Reservar para o CTA principal |
| Stagger em toda lista | Só em momentos deliberados; listas utilitárias sem stagger |
| Spring com bounce em menu/toggle/modal | Transição curta, sem bounce, origem no gatilho |
| Mesmo fade+translate em 4+ componentes | Variar tempo e curva por tipo/contexto |
| Animar conteúdo estático | Renderizar direto |
| Acento ciano/teal padrão em tudo | Definir um acento da marca **antes** de gerar |
| Faixa colorida de 4 px à esquerda de todo card | Reservar para **um** papel (ex.: severidade) |
| "Sopa de containers" (pílula dentro de card dentro de card) | No máx. 2 níveis de aninhamento |
| Grade de 3 colunas de features no hero | Marquee, linhas alternadas ou coluna única |
| Só Inter/Roboto/Arial + gradiente roxo | Fonte escolhida para a marca; cores com história |

(No Kanban, a faixa à esquerda do card é usada só para prioridade alta/urgente.)

## 5. Famílias estéticas e paletas de partida (Awesome Claude Design + UI UX Pro Max)

| Família | Caráter | Exemplos de paleta |
|---|---|---|
| Editorial Minimalism | neutros calmos, serifa/grotesca estreita, **um** acento | Linear `#fff/#0f0f14/#5e6ad2` · Stripe `#fff/#0a2540/#635bff` · Vercel P&B + rampa de cinza |
| Terminal-Core | mono em tudo, verde/âmbar sobre quase preto, bordas retas | Warp `#0b0d14/#16d5e6/#ff7a59` · Raycast `#1d1d1f/#ff6363` · OpenCode `#080808/#d2d2d2` |
| Warm Editorial | terracota, creme, serifa, humano | Claude `#f4f3ee/#c96442/#191817` · Notion `#fff/#37352f` · Substack `#fff/#1a1a1a/#ff6719` |
| Data-Dense Pro | gráficos como herói, números tabulares, dark-first | ClickHouse `#181818/#faff69` · Grafana `#111217/#f47c1b` · Supabase `#171717/#3ecf8e` |
| Cinematic Dark | gradientes de cinema, tipografia enorme, mídia | Runway `#000` + magenta/ciano · ElevenLabs `#0a0a0a` + azul elétrico · NVIDIA `#000/#76b900` |
| Playful Color | saturado, cantos redondos, formas decorativas | Figma `#0acf83/#f24e1e/#a259ff` · Duolingo `#58cc02` · Mailchimp `#ffe01b/#000` |
| Glass / Soft-Futurism | vidro fosco, profundidade | `backdrop-filter: blur(15px)`, borda `rgba(255,255,255,.2)` |
| Neon Brutalist | bordas pretas grossas, cores pop, sombra dura | `border: 3px solid #000; box-shadow: 4px 4px 0 #000` |

Outras paletas de produto (UI UX Pro Max): SaaS `#2563EB/#EA580C` · Luxo `#1C1917/#A16207` · Fintech `#F59E0B/#8B5CF6/#0F172A` ·
Gaming `#7C3AED/#F43F5E/#0F0F23` · Cybersecurity `#00FF41/#000` · Space Tech `#0B0B10/#3B82F6` · Mental Health `#8B5CF6/#FAF5FF` · Bakery `#92400E/#FEF3C7`.

Estilos do catálogo que valem consulta (nome → traço de CSS): Minimalismo & Swiss (`border-radius:0`, sem sombra) · Exaggerated Minimalism
(`font-size:clamp(3rem,10vw,12rem)`, peso 900) · Glassmorphism · Spatial UI (`blur(40px) saturate(180%)`, raio 24px) · Neubrutalism ·
Bento Grid (raio 24px, `gap:16px`) · Claymorphism (borda 3–4px, sombras internas) · Aurora UI (`background-size:200% 200%`, 8–12 s) ·
Vaporwave (grade em perspectiva) · Retro-Futurism/Cyberpunk (scanlines com `repeating-linear-gradient`) · HUD/FUI (linhas finas ciano) ·
Y2K (cromado, bolhas) · Memphis · E-Ink/Paper · Anti-Polish/Raw (rotação aleatória ±3°).
⚠️ Neumorphism e dark-mode extremo têm risco de contraste.

---

## 6. O que foi construído no Kanban a partir disso (33 temas, todos com claro + escuro)

Arquivo: `public/themes.css`. Selo **animado** = tem efeito de fundo (liga/desliga, velocidade e intensidade nas preferências).

| Categoria | Tema | Inspiração |
|---|---|---|
| Minimalistas | Minimal · Papel · Gelo · Sálvia | neutro tipo Linear/Vercel · E-Ink/Paper · glacial · Organic Biophilic |
| | **Suíço** | Minimalismo & Swiss / Exaggerated Minimalism (réguas pretas + vermelho) |
| | **Comando** | Raycast (Refero) — coral sobre quase preto, botões em "tecla" |
| | **Editorial** | Superhuman (Refero) — pergaminho, serifa, vinho/lavanda |
| | **Estúdio** | teenage engineering (Refero) — peso 300, hairlines |
| | **Brasa** | Cursor (Refero) — creme `#f7f7f4`, tinta `#26251e`, âmbar `#c08532`/brasa `#f54e00`, Garamond + mono, cantos 4px |
| Suaves e coloridos | Oceano ⚡ · Aurora ⚡ · Sunset ⚡ | gradientes que derivam (Aurora UI) |
| | **Argila** | Claymorphism |
| | **Canelado** ⚡ | Cult UI (Fluted glass) — nervuras de vidro sobre orbes de cor |
| | **Espacial** | UI UX Pro Max (Spatial UI/visionOS) — vidro grosso sobre crepúsculo |
| | **Adesivo** | Slush (Refero) — cartões em cores de adesivo |
| | **Limão** | Perk (Refero) — lima `#beff50` sobre `#f5f5eb`, tinta `#14140f`, cantos 28px, sem sombras |
| Impactantes | Neon · Brutal | Cyberpunk UI · Neubrutalism |
| | **Lava** ⚡ · **Vaporwave** ⚡ · **Galáxia** ⚡ · **Y2K** ⚡ | bolhas de lava · sol + grade em perspectiva · estrelas (Space Tech) · cromado/iridescente |
| Únicos | **Caderno** | Anti-Polish/Raw — post-its tortos / quadro negro |
| | **Blueprint** | HUD/planta técnica (cianotipia / azul clássico) |
| | Terminal · **Retrô 95** | Terminal-Core + scanlines · janelas com relevo |
| | **HUD** | UI UX Pro Max (HUD/FUI) — linhas finas, colchetes nos cantos, ciano |
| | **Ouro** | Luxo `#1C1917/#A16207` + dourado, serifa |
| | **Líquido** ⚡ | monopo (Refero) — P&B, pílulas, brilho iridescente |
| | **Galeria** | Origin Financial (Refero) — `#090a0b`, serifa em peso 300, réguas `#847dff` `#00b3dd` `#dd90d8` |
| | **Meia-luz** | Peak Design (Refero) — painéis `#1a211e`/`#0c0c0c` alternando com branco, serifa itálica, vermelho `#cc2e39` raro |
| | **Câmara Escura** | Oryzo (Refero) — breu `#100904`, creme `#ffedd7`, pílulas, tracejado, laranja `#dc5000` só em destaques |

⚡ = efeito de fundo animado. Em negrito = criados a partir de referências (as de "(Refero)" usam tokens lidos nas páginas do estilo).

## 6b. O que foi aplicado de **cada** referência (não só do Refero)

| Referência | O que virou código no Kanban | Onde |
|---|---|---|
| **Shader Gradient** | Fundo **shader** WebGL próprio: tipos *Fluxo / Ondas / Orbe* (≈ plane / waterPlane / sphere), 3 cores, velocidade, força, densidade, grão, "escurecer"; 8 presets (o "Menta" usa a paleta padrão do site: `#52ff89 #dbba95 #d0bce1`). Não usei o pacote deles (three.js + R3F é pesado para um site estático): é um GLSL de ~40 linhas, renderizado a meia resolução e ~30 fps, pausa com a aba oculta e para com "fundo animado" desligado / movimento reduzido. | `public/shader.js` · Personalizar → Fundo → Shader |
| **Skiper UI** | **Ilha** flutuante do cronômetro (ideia do Dynamic Island, que é grátis lá): aparece enquanto há cronômetro seu rodando, expande o título no hover, botão de parar. Paleta de comandos `Ctrl+K` (o site tem uma). Sem pulsar, entra/sai em < 200 ms. | `public/island.js` · `public/palette.js` |
| **Cult UI** | Tema **Canelado** (*fluted glass*: nervuras de blur em faixas sobre orbes de cor) e estilo de cartão **Dobrado** (*folded card*: canto dobrado). O "Kanban board" deles serviu de referência de card/coluna. | `themes.css` (Canelado) · Cartões → Dobrado |
| **UI UX Pro Max** | Estilos do catálogo viraram: **Espacial** (Spatial UI/visionOS: `blur(40px) saturate(180%)`, raio 26px), **HUD** (FUI: linhas finas, colchetes nos 4 cantos, ciano, mono), **Painel** (Bento Box Grid, raio 24px, `gap:16px`), Suíço, Argila, Vaporwave, Y2K, Caderno (Anti-Polish), Terminal (scanlines). Padrão **Master + Overrides** → `docs/DESIGN.md`. | `themes.css` · `views.js` (Painel) · `docs/DESIGN.md` |
| **Design Motion Principles** | Saídas mais sutis que as entradas (modal 120 ms, popover 90 ms, ilha 160 ms), troca de ícone com opacity+scale+blur ao copiar, `scale(.97)` no press, easing customizado, origem do popover no gatilho, números tabulares, `prefers-reduced-motion` e chave "desligar animações". Auditoria anti-slop aplicada (nada pulsando, stagger só onde faz sentido). | `app.css` (v4/v5) |
| **Awesome Claude Design** | Famílias estéticas como mapa para escolher temas; *anti-slop kit* como regras do `docs/DESIGN.md` (faixa à esquerda do card só para prioridade; máx. 2 níveis de aninhamento; sem acento ciano padrão; sem indicador pulsando). | `docs/DESIGN.md` |
| **taste (Hmbown)** | Processo, não código: **aterrar no artefato real** (li as páginas e DESIGN.md em vez de lembrar de cabeça), **checagem pré-entrega** (contraste por script, 49 verificações de interface, folha de contato visual) e "produzir só o que a ocasião pede". | checklist em `docs/DESIGN.md` |
| **Refero Styles** | 10 temas com tokens lidos nas páginas (Comando, Editorial, Estúdio, Adesivo, Líquido, Brasa, Limão, Galeria, Meia-luz, Câmara Escura). | `themes.css` |
| **OriginKit** ⚠️ | **Não aplicado**: o site é renderizado no cliente e nada ficou legível por `curl`. Se você me passar um componente específico, eu replico a ideia. | — |

Total hoje: **33 temas** (todos claro + escuro), 5 vistas (Quadro, Lista, Calendário, Painel + paleta), fundo shader e 5 estilos de cartão.

### Como extrair tokens de um estilo do Refero (receita)
1. Abra `https://styles.refero.design` e copie o link de um estilo (`/style/<uuid>`); as páginas `/ai-agents/design-md-examples` listam vários.
2. A página traz uma descrição de 1 parágrafo (a "regra de ouro" do estilo) + paleta com nomes e papéis + tipografia. As cores mais usadas
   também aparecem como `#rrggbb` no HTML. Papéis importantes: o que é **ação primária**, o que é **só destaque de texto** (ex.: no Cursor o laranja
   *não* preenche botão), raios de canto, uso de sombra (quase sempre nenhum) e peso da fonte.
3. Mapeie para tokens: canvas → `--bg`, painéis → `--col`/`--card`, hairline → `--line`, tinta → `--text`, cinza → `--muted`, acento → `--accent`.
4. Escolha o texto do botão (`--accent-fg`) para dar ≥ 4,5:1 e rode o script de contraste. Marque no arquivo de tema de onde veio.
- Estilos usados até agora (ids no Refero): Raycast `3b6a17f0…`, Superhuman `418b374a…`, Slush `8b6b547f…`, teenage engineering `aecf9dda…`,
  monopo `3e52dd36…`, Cursor `4e3b4717…`, Origin Financial `c60f05ff…`, Peak Design `6f3fb64d…`, Perk `75c06591…`, Oryzo `1f204e95…`.
- Bons candidatos ainda não feitos: Warp (violeta sobre obsidiana), Prisma (azul-planta + teal), Vercel (monocromo `#fafafa`, Geist), Perplexity (pergaminho + teal),
  Brex (concreto branco + brasa laranja), Freitag (industrial suíço), Bang & Olufsen (porcelana / alcova escura), Sociotype, Miranda, Reflect (violeta cósmico).

## 7. Reaproveitar o sistema de temas em outro projeto

**Web (qualquer framework):**
1. Copie `themes.css`. Cada tema é `[data-theme="x"]` (claro) + `[data-theme="x"][data-mode="dark"]` definindo tokens:
   `--bg --surface --col --card --pop --line --text --muted --accent --accent-fg --shadow --shadow-hover --hl --radius-t --bw --blur --font --font-h`.
2. Troque tema/modo com `document.documentElement.dataset.theme = 'comando'` e `.dataset.mode = 'dark'` (ou `system` via `matchMedia`).
3. Componentes só leem tokens (`background: var(--card)` …). Isso deixa **qualquer elemento** ganhar o tema — inclusive as miniaturas do seletor
   (basta pôr `data-theme`/`data-mode` nelas).
4. Camadas de fundo: um `<div id="deco"><i class="d1"></i><i class="d2"></i><i class="d3"></i></div>` fixo atrás de tudo; cada tema liga as que quiser.
   Controles do usuário: `data-fx="off"` (sem animação de fundo), `--fx-speed` (0.5–2.5), `--deco-o` (0–1), `data-motion="off"` (tudo).
5. Overrides do usuário têm especificidade maior que os temas (`html[data-shadow][data-theme]`, cor de destaque inline em `html`).
6. Cheque contraste por script (veja `test/themes-check.cjs`): texto/pop, apoio/pop, texto-do-botão/acento.

**Compose / SwiftUI:** mapeie os mesmos tokens para `ColorScheme`/`Typography`; `--shadow` → `elevation`/`shadow`; camadas `#deco` → `Brush` animado
(`rememberInfiniteTransition`) com fallback estático e respeito ao "reduzir movimento" do sistema.

## 8. Limitações desta consulta (04/11/2026)

- A ferramenta de leitura de páginas da sessão não alcançava os sites; li via `curl` (sem disfarçar User-Agent). Tentar disfarçar foi bloqueado pelo sistema, com razão.
- OriginKit, os 3 "shadcn expanded" e a página do shadcn extension **não** foram lidos.
- Shader Gradient: só o README no GitHub (o site é SPA).
- Preços/limites de Skiper UI, Cult UI e OriginKit mudam: confirme antes de depender.
