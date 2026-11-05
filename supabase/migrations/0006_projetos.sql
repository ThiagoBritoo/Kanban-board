-- Projetos: cada projeto tem as próprias colunas, tasks, anotações e membros. Quem não é membro não vê nada.
-- Os dados que já existem viram o projeto "Geral" (todos os membros aprovados entram nele), então o app antigo continua funcionando.

/* ============ tabelas ============ */
create table public.projects (
  id         bigint generated always as identity primary key,
  name       text not null check (char_length(name) between 1 and 60),
  owner_id   uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.project_members (
  project_id bigint not null references public.projects(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'member' check (role in ('owner', 'member')),
  can_invite boolean not null default false,   -- o dono libera quem mais pode convidar
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index project_members_user on public.project_members(user_id);
create table public.project_invites (
  id         bigint generated always as identity primary key,
  project_id bigint not null references public.projects(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, invitee_id)
);

/* ============ helpers de permissão ============ */
create function public.is_project_member(pid bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_member() and exists (select 1 from public.project_members where project_id = pid and user_id = (select auth.uid()))
$$;
create function public.is_project_owner(pid bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_member() and exists (select 1 from public.project_members where project_id = pid and user_id = (select auth.uid()) and role = 'owner')
$$;
create function public.can_invite_to(pid bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_member() and exists (select 1 from public.project_members
    where project_id = pid and user_id = (select auth.uid()) and (role = 'owner' or can_invite))
$$;
create function public.shares_project(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.project_members a join public.project_members b on a.project_id = b.project_id
                  where a.user_id = (select auth.uid()) and b.user_id = uid)
$$;
revoke all on function public.is_project_member(bigint), public.is_project_owner(bigint), public.can_invite_to(bigint), public.shares_project(uuid) from public, anon;
grant execute on function public.is_project_member(bigint), public.is_project_owner(bigint), public.can_invite_to(bigint), public.shares_project(uuid) to authenticated;

/* ============ projeto "Geral" com tudo o que já existe ============ */
alter table public.board_columns add column project_id bigint references public.projects(id) on delete cascade;
alter table public.tasks         add column project_id bigint references public.projects(id) on delete cascade;
alter table public.notes         add column project_id bigint references public.projects(id) on delete cascade;

do $$
declare pid bigint;
begin
  insert into public.projects(name, owner_id)
    values ('Geral', (select id from public.profiles where role = 'admin' and approved order by created_at limit 1))
    returning id into pid;
  insert into public.project_members(project_id, user_id, role, can_invite)
    select pid, id, case when id = (select owner_id from public.projects where id = pid) then 'owner' else 'member' end,
           id = (select owner_id from public.projects where id = pid)
      from public.profiles where approved;
  alter table public.tasks disable trigger tasks_bu;
  update public.board_columns set project_id = pid;
  update public.tasks set project_id = pid;
  update public.notes set project_id = pid;
  alter table public.tasks enable trigger tasks_bu;
end $$;
alter table public.board_columns alter column project_id set not null;
alter table public.tasks         alter column project_id set not null;
alter table public.notes         alter column project_id set not null;
create index board_columns_project on public.board_columns(project_id, position);
create index tasks_project on public.tasks(project_id);
create index notes_project on public.notes(project_id);

/* ============ gatilhos: o projeto vem da coluna; ninguém muda de projeto ============ */
create or replace function public.columns_before_insert() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- app antigo não manda project_id: usa o projeto mais antigo da pessoa
  new.project_id := coalesce(new.project_id,
    (select project_id from public.project_members where user_id = (select auth.uid()) order by created_at, project_id limit 1));
  new.position := (select coalesce(max(position), -1) + 1 from public.board_columns where project_id = new.project_id);
  return new;
end $$;

create or replace function public.tasks_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare k record;
begin
  select kind, project_id into k from public.board_columns where id = new.column_id;
  new.project_id := k.project_id;
  new.creator_id := (select auth.uid());
  new.position := (select coalesce(max(position), -1) + 1 from public.tasks where column_id = new.column_id);
  new.completed_at := case when k.kind = 'done' then now() end;
  new.column_since := now();
  new.started_at := case when k.kind in ('doing', 'done') then now() end;
  new.finished_at := case when k.kind = 'done' then now() end;
  return new;
end $$;

create or replace function public.tasks_before_update() returns trigger
language plpgsql security definer set search_path = '' as $$
declare k record; fromname text;
begin
  new.project_id := old.project_id;
  if new.column_id is distinct from old.column_id then
    select * into k from public.board_columns where id = new.column_id;
    if k.project_id is distinct from old.project_id then raise exception 'Essa coluna é de outro projeto'; end if;
    select name into fromname from public.board_columns where id = old.column_id;
    new.column_since := now();
    if k.kind = 'done' then
      new.completed_at := coalesce(old.completed_at, now());
      new.finished_at  := coalesce(old.finished_at, now());
      new.started_at   := coalesce(old.started_at, now());
    else
      new.completed_at := null;
      new.finished_at  := null;
      if k.kind = 'doing' then new.started_at := coalesce(old.started_at, now()); end if;
    end if;
    perform public.log_event(new.id, 'moved', jsonb_build_object('from', fromname, 'to', k.name, 'kind', k.kind));
    if k.kind = 'doing' and new.assignee_id is null then new.assignee_id := (select auth.uid()); end if;
  end if;
  if new.assignee_id is distinct from old.assignee_id then
    if new.assignee_id is not null and not exists (select 1 from public.project_members where project_id = new.project_id and user_id = new.assignee_id) then
      raise exception 'O responsável precisa ser membro do projeto';
    end if;
    perform public.log_event(new.id, 'assigned', jsonb_build_object('to', new.assignee_id));
  end if;
  if (new.title, new.description, new.diary, new.priority, new.due_date, new.labels, new.checklist, new.notes)
     is distinct from (old.title, old.description, old.diary, old.priority, old.due_date, old.labels, old.checklist, old.notes) then
    perform public.log_event(new.id, 'edited');
  end if;
  new.updated_at := now();
  return new;
end $$;

/* ============ políticas (RLS) por projeto ============ */
drop policy columns_all on public.board_columns;
create policy columns_all on public.board_columns for all to authenticated
  using (public.is_project_member(project_id)) with check (public.is_project_member(project_id));
drop policy tasks_all on public.tasks;
create policy tasks_all on public.tasks for all to authenticated
  using (public.is_project_member(project_id)) with check (public.is_project_member(project_id));
drop policy events_select on public.events;
create policy events_select on public.events for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and public.is_project_member(t.project_id)));
drop policy notes_all on public.notes;
create policy notes_all on public.notes for all to authenticated
  using (public.is_project_member(project_id)) with check (public.is_project_member(project_id));
drop policy attachments_select on public.attachments;
drop policy attachments_insert on public.attachments;
drop policy attachments_delete on public.attachments;
create policy attachments_select on public.attachments for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and public.is_project_member(t.project_id)));
create policy attachments_insert on public.attachments for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.tasks t where t.id = task_id and public.is_project_member(t.project_id)));
create policy attachments_delete on public.attachments for delete to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and public.is_project_member(t.project_id)));

create function public.can_access_task_file(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tasks t where t.id::text = (string_to_array(p_name, '/'))[1] and public.is_project_member(t.project_id))
$$;
revoke all on function public.can_access_task_file(text) from public, anon;
grant execute on function public.can_access_task_file(text) to authenticated;
drop policy attachments_obj_select on storage.objects;
drop policy attachments_obj_insert on storage.objects;
drop policy attachments_obj_delete on storage.objects;
create policy attachments_obj_select on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and public.can_access_task_file(name));
create policy attachments_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and public.can_access_task_file(name));
create policy attachments_obj_delete on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and public.can_access_task_file(name));

-- perfis: você vê a si mesmo, quem divide projeto com você e (admin) todo mundo
drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin() or public.shares_project(id));

alter table public.projects        enable row level security;
alter table public.project_members enable row level security;
alter table public.project_invites enable row level security;
create policy projects_select on public.projects for select to authenticated using (public.is_project_member(id));
create policy members_select on public.project_members for select to authenticated using (public.is_project_member(project_id));
create policy invites_select on public.project_invites for select to authenticated
  using (invitee_id = (select auth.uid()) or public.can_invite_to(project_id));
revoke all on public.projects, public.project_members, public.project_invites from anon;
revoke insert, update, delete on public.projects, public.project_members, public.project_invites from authenticated;
grant select on public.projects, public.project_members, public.project_invites to authenticated;

/* ============ RPCs de projeto ============ */
create function public.create_project(p_name text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); pid bigint; nm text := trim(p_name);
begin
  if not public.is_member() then raise exception 'Sem permissão'; end if;
  if nm is null or char_length(nm) not between 1 and 60 then raise exception 'Nome do projeto: 1 a 60 caracteres'; end if;
  if (select count(*) from public.project_members where user_id = uid and role = 'owner') >= 20 then raise exception 'Limite de projetos atingido'; end if;
  insert into public.projects(name, owner_id) values (nm, uid) returning id into pid;
  insert into public.project_members(project_id, user_id, role, can_invite) values (pid, uid, 'owner', true);
  insert into public.board_columns(project_id, name, kind) values
    (pid, 'A fazer', 'todo'), (pid, 'Em andamento', 'doing'), (pid, 'Revisão', 'doing'), (pid, 'Concluído', 'done');
  return pid;
end $$;

create function public.rename_project(p_project bigint, p_name text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_project_owner(p_project) then raise exception 'Só o dono do projeto pode fazer isso'; end if;
  if trim(p_name) = '' or char_length(trim(p_name)) > 60 then raise exception 'Nome do projeto: 1 a 60 caracteres'; end if;
  update public.projects set name = trim(p_name) where id = p_project;
end $$;

create function public.delete_project(p_project bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_project_owner(p_project) then raise exception 'Só o dono do projeto pode excluir'; end if;
  delete from public.tasks where project_id = p_project;
  delete from public.projects where id = p_project;
end $$;

create function public.invite_to_project(p_project bigint, p_email text) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid;
begin
  if not public.can_invite_to(p_project) then raise exception 'Você não tem permissão para convidar neste projeto'; end if;
  select id into u from public.profiles where lower(email) = lower(trim(p_email)) and approved;
  if u is null then raise exception 'Não achei uma conta aprovada com esse e-mail (a pessoa precisa se cadastrar e ser aprovada antes)'; end if;
  if exists (select 1 from public.project_members where project_id = p_project and user_id = u) then raise exception 'Essa pessoa já está no projeto'; end if;
  insert into public.project_invites(project_id, invitee_id, invited_by) values (p_project, u, (select auth.uid())) on conflict do nothing;
end $$;

create function public.my_invites() returns table(id bigint, project_id bigint, project_name text, inviter_name text)
language sql stable security definer set search_path = '' as $$
  select i.id, i.project_id, p.name, (select name from public.profiles where id = i.invited_by)
    from public.project_invites i join public.projects p on p.id = i.project_id
   where i.invitee_id = (select auth.uid()) and public.is_member() order by i.id
$$;

create function public.respond_invite(p_invite bigint, p_accept boolean) returns bigint
language plpgsql security definer set search_path = '' as $$
declare inv record;
begin
  select * into inv from public.project_invites where id = p_invite and invitee_id = (select auth.uid());
  if not found then raise exception 'Convite não encontrado'; end if;
  delete from public.project_invites where id = p_invite;
  if p_accept then
    insert into public.project_members(project_id, user_id, role) values (inv.project_id, inv.invitee_id, 'member') on conflict do nothing;
    return inv.project_id;
  end if;
  return null;
end $$;

create function public.cancel_invite(p_invite bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.project_invites where id = p_invite and (public.is_project_owner(project_id) or invited_by = (select auth.uid()));
end $$;

-- o dono remove alguém; qualquer um pode sair (menos o único dono)
create function public.remove_member(p_project bigint, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if p_user <> uid and not public.is_project_owner(p_project) then raise exception 'Só o dono do projeto pode remover membros'; end if;
  if not public.is_member() then raise exception 'Sem permissão'; end if;
  if exists (select 1 from public.project_members where project_id = p_project and user_id = p_user and role = 'owner')
     and (select count(*) from public.project_members where project_id = p_project and role = 'owner') <= 1 then
    raise exception 'O projeto precisa de um dono: passe a posse ou exclua o projeto';
  end if;
  update public.tasks set assignee_id = null where project_id = p_project and assignee_id = p_user;
  delete from public.project_members where project_id = p_project and user_id = p_user;
end $$;

create function public.set_member_role(p_project bigint, p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_project_owner(p_project) then raise exception 'Só o dono do projeto pode fazer isso'; end if;
  if p_role not in ('owner', 'member') then raise exception 'Papel inválido'; end if;
  if p_role = 'member' and (select count(*) from public.project_members where project_id = p_project and role = 'owner' and user_id <> p_user) = 0 then
    raise exception 'O projeto precisa de pelo menos um dono';
  end if;
  update public.project_members set role = p_role where project_id = p_project and user_id = p_user;
end $$;

create function public.set_member_can_invite(p_project bigint, p_user uuid, p_can boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_project_owner(p_project) then raise exception 'Só o dono do projeto pode fazer isso'; end if;
  update public.project_members set can_invite = p_can where project_id = p_project and user_id = p_user and role <> 'owner';
end $$;

revoke all on function public.set_member_can_invite(bigint, uuid, boolean) from public, anon;
grant execute on function public.set_member_can_invite(bigint, uuid, boolean) to authenticated;

revoke all on function public.create_project(text), public.rename_project(bigint, text), public.delete_project(bigint),
  public.invite_to_project(bigint, text), public.my_invites(), public.respond_invite(bigint, boolean), public.cancel_invite(bigint),
  public.remove_member(bigint, uuid), public.set_member_role(bigint, uuid, text) from public, anon;
grant execute on function public.create_project(text), public.rename_project(bigint, text), public.delete_project(bigint),
  public.invite_to_project(bigint, text), public.my_invites(), public.respond_invite(bigint, boolean), public.cancel_invite(bigint),
  public.remove_member(bigint, uuid), public.set_member_role(bigint, uuid, text) to authenticated;

/* ============ RPCs existentes: agora com a checagem de projeto ============ */
create or replace function public.move_task(p_task bigint, p_column bigint, p_before bigint default null)
returns void language plpgsql set search_path = '' as $$
declare arr bigint[]; idx int;
begin
  if not public.is_member() then raise exception 'Sem permissão'; end if;
  update public.tasks set column_id = p_column where id = p_task and column_id <> p_column;
  arr := array(select id from public.tasks where column_id = p_column and id <> p_task and deleted_at is null order by position, id);
  idx := case when p_before is null then null else array_position(arr, p_before) end;
  if idx is null then arr := arr || p_task; else arr := arr[1:idx - 1] || p_task || arr[idx:]; end if;
  update public.tasks t set position = o.ord - 1
    from unnest(arr) with ordinality as o(id, ord)
   where t.id = o.id and t.position is distinct from (o.ord - 1)::int;
end $$;

create or replace function public.move_column(p_id bigint, p_dir int) returns void
language plpgsql set search_path = '' as $$
declare arr bigint[]; i int; j int; tmp bigint; pid bigint;
begin
  select project_id into pid from public.board_columns where id = p_id;
  if pid is null or not public.is_project_member(pid) then raise exception 'Sem permissão'; end if;
  arr := array(select id from public.board_columns where project_id = pid order by position, id);
  i := array_position(arr, p_id); j := i + p_dir;
  if i is null or j < 1 or j > cardinality(arr) then return; end if;
  tmp := arr[i]; arr[i] := arr[j]; arr[j] := tmp;
  update public.board_columns c set position = o.ord - 1 from unnest(arr) with ordinality as o(id, ord) where c.id = o.id;
end $$;

create or replace function public.delete_column(p_id bigint, p_move_to bigint default null) returns void
language plpgsql set search_path = '' as $$
declare n int; base int; pid bigint;
begin
  select project_id into pid from public.board_columns where id = p_id;
  if pid is null or not public.is_project_member(pid) then raise exception 'Sem permissão'; end if;
  if (select count(*) from public.board_columns where project_id = pid) <= 1 then raise exception 'O quadro precisa ter pelo menos uma coluna'; end if;
  select count(*) into n from public.tasks where column_id = p_id;
  if n > 0 then
    if p_move_to is null or p_move_to = p_id or not exists (select 1 from public.board_columns where id = p_move_to and project_id = pid) then
      raise exception 'Escolha para onde levar as tasks desta coluna';
    end if;
    perform set_config('kanban.skip_events', '1', true);
    select coalesce(max(position), -1) + 1 into base from public.tasks where column_id = p_move_to;
    update public.tasks t set column_id = p_move_to, position = base + s.rn - 1
      from (select id, row_number() over (order by position, id) rn from public.tasks where column_id = p_id) s
     where t.id = s.id;
  end if;
  delete from public.board_columns where id = p_id;
  update public.board_columns c set position = o.ord - 1
    from (select id, row_number() over (order by position, id) ord from public.board_columns where project_id = pid) o where c.id = o.id;
end $$;

create or replace function public.reorder_column(p_column bigint, p_ids bigint[]) returns void
language plpgsql set search_path = '' as $$
begin
  if not public.is_project_member((select project_id from public.board_columns where id = p_column)) then raise exception 'Sem permissão'; end if;
  update public.tasks t set position = o.ord - 1
    from unnest(p_ids) with ordinality as o(id, ord)
   where t.id = o.id and t.column_id = p_column;
end $$;

create or replace function public.add_comment(p_task bigint, p_text text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  p_text := trim(p_text);
  if p_text is null or p_text = '' or char_length(p_text) > 2000 then raise exception 'Comentário inválido (1 a 2000 caracteres)'; end if;
  if not exists (select 1 from public.tasks where id = p_task and public.is_project_member(project_id)) then raise exception 'Task não encontrada'; end if;
  insert into public.events(task_id, user_id, type, data) values (p_task, (select auth.uid()), 'comment', jsonb_build_object('text', p_text));
end $$;

create or replace function public.log_worked(p_task bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.tasks where id = p_task and public.is_project_member(project_id)) then raise exception 'Task não encontrada'; end if;
  perform public.log_event(p_task, 'worked');
end $$;

create or replace function public.toggle_timer(p_task bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); t record; secs int;
begin
  select * into t from public.tasks where id = p_task and deleted_at is null and public.is_project_member(project_id);
  if not found then raise exception 'Task não encontrada'; end if;
  if t.timer_started_at is not null then
    secs := greatest(0, extract(epoch from now() - t.timer_started_at)::int);
    update public.tasks set time_spent = time_spent + secs, timer_started_at = null, timer_user = null where id = p_task;
    perform public.log_event(p_task, 'timer', jsonb_build_object('action', 'stop', 'seconds', secs));
  else
    update public.tasks set timer_started_at = now(), timer_user = uid where id = p_task;
    perform public.log_event(p_task, 'timer', jsonb_build_object('action', 'start'));
  end if;
end $$;

create or replace function public.apply_column_rules() returns int
language plpgsql security definer set search_path = '' as $$
declare c record; n int := 0; moved int; base int; toname text;
begin
  if not public.is_member() then raise exception 'Sem permissão'; end if;
  perform set_config('kanban.skip_events', '1', true);
  for c in select id, name, auto_days, auto_to, project_id from public.board_columns
            where auto_days is not null and auto_to is not null and public.is_project_member(project_id) order by position, id loop
    select name into toname from public.board_columns where id = c.auto_to and project_id = c.project_id;
    if toname is null then continue; end if;
    select coalesce(max(position), -1) + 1 into base from public.tasks where column_id = c.auto_to;
    with m as (
      select id, row_number() over (order by column_since, id) rn from public.tasks
       where column_id = c.id and deleted_at is null and column_since < now() - make_interval(days => c.auto_days)
    ), upd as (
      update public.tasks t set column_id = c.auto_to, position = base + m.rn - 1 from m where t.id = m.id returning t.id
    )
    insert into public.events(task_id, user_id, type, data)
      select id, null, 'auto', jsonb_build_object('from', c.name, 'to', toname, 'days', c.auto_days) from upd;
    get diagnostics moved = row_count;
    n := n + moved;
  end loop;
  return n;
end $$;

-- diário: opcionalmente de um projeto só (sem projeto = todos os seus)
drop function public.diary(timestamptz, timestamptz, boolean, boolean);
create function public.diary(p_from timestamptz, p_to timestamptz, p_team boolean default false, p_doing boolean default true, p_project bigint default null)
returns table(id bigint, title text, diary text, column_name text, kind text, first_at timestamptz, source text)
language sql stable set search_path = '' as $$
  select * from (
    select t.id, t.title, t.diary, k.name, k.kind, min(e.at) as first_at, 'activity'::text as source
      from public.events e
      join public.tasks t on t.id = e.task_id and t.deleted_at is null and (p_project is null or t.project_id = p_project)
      join public.board_columns k on k.id = t.column_id
     where e.at between p_from and p_to and (p_team or e.user_id = (select auth.uid()))
     group by t.id, k.name, k.kind
    union all
    select t.id, t.title, t.diary, k.name, k.kind, t.created_at, 'doing'::text
      from public.tasks t join public.board_columns k on k.id = t.column_id
     where p_doing and k.kind = 'doing' and t.deleted_at is null and (p_project is null or t.project_id = p_project)
       and (case when p_team then t.assignee_id is not null else t.assignee_id = (select auth.uid()) end)
       and not exists (select 1 from public.events e where e.task_id = t.id and e.at between p_from and p_to
                       and (p_team or e.user_id = (select auth.uid())))
  ) x order by (x.source = 'doing'), x.first_at
$$;
revoke all on function public.diary(timestamptz, timestamptz, boolean, boolean, bigint) from public, anon;
grant execute on function public.diary(timestamptz, timestamptz, boolean, boolean, bigint) to authenticated;

/* ============ funções usadas só pela API externa (função de borda, com a chave de serviço) ============ */
create function public.api_create_task(p_user uuid, p_project bigint, p_column bigint, p_title text, p_description text default '',
  p_priority int default 1, p_due date default null, p_labels text[] default '{}', p_notes text default '') returns bigint
language plpgsql security definer set search_path = '' as $$
declare tid bigint; cid bigint := p_column;
begin
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  if not (exists (select 1 from public.profiles where id = p_user and approved)
          and exists (select 1 from public.project_members where project_id = p_project and user_id = p_user)) then
    raise exception 'Sem acesso a este projeto';
  end if;
  if cid is null or not exists (select 1 from public.board_columns where id = cid and project_id = p_project) then
    select id into cid from public.board_columns where project_id = p_project and kind = 'todo' order by position, id limit 1;
  end if;
  if cid is null then raise exception 'Projeto sem colunas'; end if;
  insert into public.tasks(title, description, column_id, priority, due_date, labels, notes, assignee_id)
    values (left(trim(p_title), 300), left(coalesce(p_description, ''), 10000), cid, greatest(0, least(3, coalesce(p_priority, 1))), p_due,
            coalesce((select array_agg(l) from (select distinct left(trim(x), 24) l from unnest(p_labels) x where trim(x) <> '' limit 8) s), '{}'),
            left(coalesce(p_notes, ''), 20000),
            p_user)
    returning id into tid;
  return tid;
end $$;

create function public.api_move_task(p_user uuid, p_task bigint, p_column bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare pid bigint;
begin
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  select project_id into pid from public.tasks where id = p_task;
  if pid is null or not exists (select 1 from public.project_members where project_id = pid and user_id = p_user) then raise exception 'Sem acesso a esta task'; end if;
  if not exists (select 1 from public.board_columns where id = p_column and project_id = pid) then raise exception 'Coluna inválida'; end if;
  update public.tasks set column_id = p_column,
    position = (select coalesce(max(position), -1) + 1 from public.tasks where column_id = p_column) where id = p_task;
end $$;

create function public.api_comment(p_user uuid, p_task bigint, p_text text) returns void
language plpgsql security definer set search_path = '' as $$
declare pid bigint;
begin
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  select project_id into pid from public.tasks where id = p_task;
  if pid is null or not exists (select 1 from public.project_members where project_id = pid and user_id = p_user) then raise exception 'Sem acesso a esta task'; end if;
  if trim(coalesce(p_text, '')) = '' or char_length(p_text) > 2000 then raise exception 'Comentário inválido'; end if;
  insert into public.events(task_id, user_id, type, data) values (p_task, p_user, 'comment', jsonb_build_object('text', trim(p_text)));
end $$;
revoke all on function public.api_create_task(uuid, bigint, bigint, text, text, int, date, text[], text), public.api_move_task(uuid, bigint, bigint),
  public.api_comment(uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.api_create_task(uuid, bigint, bigint, text, text, int, date, text[], text), public.api_move_task(uuid, bigint, bigint),
  public.api_comment(uuid, bigint, text) to service_role;

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.projects, public.project_members, public.project_invites;
  end if;
end $$;
