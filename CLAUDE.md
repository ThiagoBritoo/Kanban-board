# Kanban da empresa — contexto do projeto

Estado atual do projeto, IDs, fluxo de trabalho e pendências: @docs/HANDOFF.md (leia primeiro numa sessão nova).
Antes de mudar qualquer interface, leia @docs/DESIGN.md (tokens, movimento, anti-slop, checklist de entrega).
Use cores, tipografia e espaçamento do design system; derive campos, textos e estados deste projeto, não de memória.

## Como o projeto funciona
- Site estático em `public/` (HTML/CSS/JS puro, sem build) + Supabase (login, banco com RLS, tempo real, storage). Deploy: Vercel a cada merge na `main`.
- Banco: `supabase/migrations/` (rodar em ordem). Só migrações **aditivas**; nunca quebrar o que já está em produção.
- Temas: `public/themes.css` (cada tema tem claro e escuro). Núcleo: `public/app.js`; vistas: `views.js`; fundo WebGL: `shader.js`, `terrain.js` (fundo Canvas 2D).

## Como verificar (obrigatório antes de dar por pronto)
```bash
npm i --no-save playwright @supabase/supabase-js@2.45.4 && npx playwright install chromium   # uma vez
SUPABASE_UMD=node_modules/@supabase/supabase-js/dist/umd/supabase.js node test/e2e.cjs        # interface (API Supabase falsa)
SUPABASE_UMD=... node test/shader.cjs                                                          # fundo shader (WebGL por software)
SUPABASE_UMD=... node test/themes-check.cjs /tmp/capturas                                      # contraste + folha de contato dos temas
```
Olhe as capturas (claro e escuro, desktop e celular). O teste usa uma API falsa: não substitui conferir o site publicado.

## Regras que já custaram caro
- Não confie só em código: abra a tela (Playwright) e olhe.
- Contraste mínimo: texto/pop 7:1, apoio 3,5:1, texto do botão sobre o acento 4,5:1 — nos dois modos.
- Sem animações pulsando; saídas mais sutis que as entradas; respeitar `prefers-reduced-motion`.
- Ao usar biblioteca de componentes (OriginKit, Cult UI, Skiper UI) abra a **página do componente** (variantes e controles), não só a home do site, e reproduza o *efeito* com código próprio.
- Não disfarçar User-Agent nem contornar proteção de site ao pesquisar referências (use `scripts/browse-sites.cjs`).
