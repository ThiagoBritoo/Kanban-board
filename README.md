# Kanban da empresa

Quadro Kanban com contas, 8 temas (todos com modo escuro), criação rápida de tasks e gerador de diário.
Front estático (HTML/CSS/JS puro) + **Supabase** para login, banco e tempo real. Sem servidor próprio: dá para hospedar de graça.

## Já está conectado

O projeto Supabase `kanban-empresa` já foi criado e o banco aplicado (`supabase/migrations/`). A URL e a chave
pública (anon) estão em `public/config.js`. A chave anon é pública por desenho; quem protege os dados é o RLS do banco.

## Rodar local

```bash
npm start     # http://localhost:3000
```

## Publicar grátis

**Vercel (em uso):** importe o repositório com *Framework: Other*, sem build e *Output Directory: `public`*.
Cada push na `main` publica sozinho; branches e PRs ganham um endereço de prévia.
Também serve Cloudflare Pages ou Netlify: conecte este repositório. **Sem comando de build**, pasta de saída: `public`.
2. No Supabase: *Authentication → URL Configuration*: em **Site URL** coloque o endereço publicado
   (e adicione também em *Redirect URLs*). Sem isso, os links de e-mail (confirmar conta, recuperar senha) apontam errado.
3. Opcional: *Authentication → Sign In / Providers → Email*: desligue **Confirm email** se não quiser exigir confirmação por e-mail
   (a aprovação pelo administrador já controla quem entra).

## Contas e permissões

- A **primeira conta criada** vira administradora automaticamente. **Crie a sua antes de passar o endereço para qualquer pessoa.**
- As demais contas ficam *pendentes* e não enxergam nada até o admin aprovar em *avatar → Equipe*.
- Quem não está aprovado é barrado pelo próprio banco (RLS), não só pela tela.
- Admin pode promover/rebaixar e tirar acesso. Senha esquecida: link "Esqueci a senha" na tela de login.

## Uso

- **Criar task**: `N` abre a criação rápida; ou digite direto no campo no fim de cada coluna.
  Atalhos no texto: `#etiqueta` `@nome` `!alta` (`!baixa` `!urgente`) `^amanhã` `^25/12`. `Ctrl+Enter` cria e continua.
- **Menu do card** (`⋯`): mover de coluna, pegar/soltar, excluir. É a forma de mover tasks no celular.
- **Vistas**: Quadro, Lista (ordenável) e Calendário (arraste a task para outro dia para mudar o prazo). Botões ao lado da busca.
- **Paleta de comandos** (`Ctrl+K`): busca tasks e roda comandos (trocar tema, filtrar, ir para uma vista…). O menu `⋯` do topo tem Resumo, Atividade e exportações.
- **Cronômetro** por task (só um rodando por pessoa), **anexos** (até 10 MB; cole um print com `Ctrl+V` ou arraste arquivos) e **limite de tasks por coluna** (menu `⋯` da coluna, também ordena a coluna).
- **Resumo da equipe**: criadas × concluídas por dia, tempo médio até concluir e carga por pessoa. **Atividade recente**: quem fez o quê.
- **Exportar** tasks em CSV (abre no Excel) e **backup completo** em JSON.
- **No celular**: segure ~0,4 s num card e arraste para outra coluna (ou use o menu do card). Aviso na tela quando alguém te atribui uma task; opcionalmente notificação do sistema (Personalizar → Comportamento).
- **Desfazer**: excluir e mover mostram um aviso com *Desfazer*. Excluir só manda para a lixeira (nada é apagado de verdade).
- **Checklist e comentários** dentro de cada task. Mexer neles conta como trabalho no diário.
- **Filtros**: Minhas / Sem dono / pessoa, *Atrasadas*, *Vencem hoje* e etiquetas (clique numa etiqueta do card).
- **Quem pegou**: botão *Pegar* no card, ou mover uma task sem dono para uma coluna "em andamento".
- **Arrastar** cards entre colunas; no celular, abra o card e troque o *Status*.
- **Gerar diário**: bullets do que você criou, moveu, editou, comentou ou marcou com *Trabalhei hoje* (mais suas tasks em andamento). Períodos: Hoje, Ontem, Semana (com o dia como título) ou um dia à escolha.
  O campo *Texto para o diário* da task define como a linha aparece.
- **Personalizar** (paleta): **25 temas** (minimalistas, suaves, impactantes e únicos), todos com claro/escuro/sistema; os animados têm um selo e dá para desligar o fundo animado, ajustar velocidade e intensidade. Também: fundo (gradientes ou imagem https), cor de destaque, fonte, cantos, densidade, estilo dos cartões (sólido/vidro/contorno), bordas, sombras e tamanho do texto. Cor por coluna no menu `⋯` da coluna. Segue a sua conta.
- **Instalar no celular**: abra o site no Chrome/Safari e use *Adicionar à tela inicial*.
- Atalhos: `N` nova task · `/` buscar · `Esc` fecha.

## Estrutura

- `public/` site estático: `themes.css` (os 20 temas e efeitos de fundo), `app.js` (núcleo), `views.js` (lista, calendário, resumo, exportar), `palette.js`, `touch.js`, `backend.js` (camada Supabase), `app.css` (temas)
- `vercel.json` cabeçalhos de segurança (CSP etc.); `public/_headers` é o equivalente para Netlify/Cloudflare
- `supabase/migrations/` esquema, RLS, gatilhos de histórico e funções (rode na ordem, no SQL Editor, num projeto novo)
- `test/` teste de interface com uma API Supabase falsa (instruções no topo de `test/e2e.cjs`)
