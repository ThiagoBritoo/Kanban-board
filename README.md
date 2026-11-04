# Kanban da empresa

Quadro Kanban com contas de usuário, 8 temas (todos com modo escuro), criação rápida de tasks e gerador de diário.
Sem dependências: só Node 22.13+ (SQLite já vem embutido).

## Rodar

```bash
npm start            # http://localhost:3000
PORT=8080 npm start  # outra porta
```

No primeiro acesso a tela pede para criar a **conta de administrador**. Depois, em
*avatar → Equipe*, crie as contas das outras pessoas (e-mail + senha inicial).
Para outra pessoa da empresa acessar, ela abre `http://IP-DA-SUA-MAQUINA:3000` na mesma rede.
Se for expor na internet, coloque atrás de um proxy com HTTPS (Caddy, Nginx…).

Os dados ficam em `data/kanban.db` (mude com `DATA_DIR=/caminho`). Para backup, copie essa pasta.

## Uso

- **Criar task**: `N` abre a criação rápida; ou digite direto no campo no fim de cada coluna.
  Atalhos no texto: `#etiqueta` `@nome` `!alta` (`!baixa` `!urgente`) `^amanhã` `^25/12`.
  `Ctrl+Enter` cria e continua.
- **Quem pegou**: botão *Pegar* no card, ou mover uma task sem dono para uma coluna "em andamento".
- **Arrastar** cards entre colunas; no celular, abra o card e troque o *Status*.
- **Gerar diário**: lista em bullets o que você criou, moveu, editou ou marcou com *Trabalhei hoje*
  (mais suas tasks em andamento). O campo *Texto para o diário* da task define como a linha aparece.
- **Colunas**: menu `⋯` da coluna (renomear, mover, excluir). "Conta como" define se é a fazer, andamento ou concluída.
- **Personalizar** (ícone de paleta): tema, claro/escuro/sistema, cor de destaque, fonte, cantos, densidade, animações.
  As preferências seguem a sua conta em qualquer navegador.
- Atalhos: `N` nova task · `/` buscar · `Esc` fecha.
