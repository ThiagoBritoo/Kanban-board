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

## Publicar grátis (Cloudflare Pages, Netlify ou Vercel)

1. Conecte este repositório. **Sem comando de build**, pasta de saída: `public`.
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
- **Quem pegou**: botão *Pegar* no card, ou mover uma task sem dono para uma coluna "em andamento".
- **Arrastar** cards entre colunas; no celular, abra o card e troque o *Status*.
- **Gerar diário**: bullets do que você criou, moveu, editou ou marcou com *Trabalhei hoje* (mais suas tasks em andamento).
  O campo *Texto para o diário* da task define como a linha aparece.
- **Personalizar** (paleta): tema, claro/escuro/sistema, cor de destaque, fonte, cantos, densidade, animações. Segue a sua conta.
- Atalhos: `N` nova task · `/` buscar · `Esc` fecha.

## Estrutura

- `public/` site estático (`index.html`, `app.js`, `backend.js` = camada Supabase, `app.css` = temas, `_headers` = segurança)
- `supabase/migrations/` esquema, RLS, gatilhos de histórico e funções (rode na ordem, no SQL Editor, num projeto novo)
