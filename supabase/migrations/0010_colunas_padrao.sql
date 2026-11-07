-- Projeto novo nasce com Backlog e Arquivado, e com regras automáticas já ligadas (o usuário muda no menu da coluna):
--   "A fazer" parada há 30 dias → Backlog · "Concluído" há 14 dias → Arquivado.
-- Arquivado é do tipo 'done' (não conta como pendente e mantém a data de conclusão).
-- SÓ TROCA o corpo de create_project (mesma assinatura e permissões); projetos que já existem não mudam.

create or replace function public.create_project(p_name text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); pid bigint; nm text := trim(p_name);
        c_backlog bigint; c_todo bigint; c_done bigint; c_arch bigint;
begin
  if not public.is_member() then raise exception 'Sem permissão'; end if;
  if nm is null or char_length(nm) not between 1 and 60 then raise exception 'Nome do projeto: 1 a 60 caracteres'; end if;
  if (select count(*) from public.project_members where user_id = uid and role = 'owner') >= 20 then raise exception 'Limite de projetos atingido'; end if;
  insert into public.projects(name, owner_id) values (nm, uid) returning id into pid;
  insert into public.project_members(project_id, user_id, role, can_invite) values (pid, uid, 'owner', true);
  -- inseridas em ordem: o gatilho columns_bi dá a posição crescente
  insert into public.board_columns(project_id, name, kind) values (pid, 'Backlog', 'todo') returning id into c_backlog;
  insert into public.board_columns(project_id, name, kind) values (pid, 'A fazer', 'todo') returning id into c_todo;
  insert into public.board_columns(project_id, name, kind) values (pid, 'Em andamento', 'doing'), (pid, 'Revisão', 'doing');
  insert into public.board_columns(project_id, name, kind) values (pid, 'Concluído', 'done') returning id into c_done;
  insert into public.board_columns(project_id, name, kind) values (pid, 'Arquivado', 'done') returning id into c_arch;
  update public.board_columns set auto_days = 30, auto_to = c_backlog where id = c_todo;
  update public.board_columns set auto_days = 14, auto_to = c_arch where id = c_done;
  return pid;
end $$;
