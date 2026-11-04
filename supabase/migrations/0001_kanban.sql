-- Kanban da empresa — esquema Supabase (Postgres + Auth + Realtime)
-- Rode inteiro no SQL Editor do Supabase (ou via CLI/MCP).

/* ============ tabelas ============ */
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  email       text not null,
  role        text not null default 'member' check (role in ('admin','member')),
  approved    boolean not null default false,
  color       text not null,
  prefs       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create table public.board_columns (
  id        bigint generated always as identity primary key,
  name      text not null check (char_length(name) between 1 and 40),
  position  int not null default 0,
  kind      text not null default 'todo' check (kind in ('todo','doing','done'))
);

create table public.tasks (
  id           bigint generated always as identity primary key,
  title        text not null check (char_length(title) between 1 and 300),
  description  text not null default '' check (char_length(description) <= 10000),
  diary        text not null default '' check (char_length(diary) <= 500),
  column_id    bigint not null references public.board_columns(id),
  position     int not null default 0,
  assignee_id  uuid references public.profiles(id) on delete set null,
  creator_id   uuid references public.profiles(id) on delete set null,
  priority     smallint not null default 1 check (priority between 0 and 3),
  due_date     date,
  labels       text[] not null default '{}' check (cardinality(labels) <= 8),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  completed_at timestamptz
);
create index tasks_col_pos on public.tasks(column_id, position);
create index tasks_assignee on public.tasks(assignee_id);

create table public.events (
  id        bigint generated always as identity primary key,
  task_id   bigint not null references public.tasks(id) on delete cascade,
  user_id   uuid references public.profiles(id) on delete set null,
  type      text not null,
  data      jsonb not null default '{}'::jsonb,
  at        timestamptz not null default now()
);
create index events_at on public.events(at);
create index events_task on public.events(task_id);
create index events_user on public.events(user_id);

insert into public.board_columns(name, position, kind) values
  ('A fazer', 0, 'todo'), ('Em andamento', 1, 'doing'), ('Revisão', 2, 'doing'), ('Concluído', 3, 'done');

/* ============ helpers de permissão ============ */
create function public.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and approved)
$$;
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and approved and role = 'admin')
$$;

/* ============ perfil criado no cadastro (1ª conta = admin) ============ */
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare first_user boolean; n int;
begin
  perform pg_advisory_xact_lock(7001);
  select count(*) into n from public.profiles;
  first_user := n = 0;
  insert into public.profiles(id, name, email, role, approved, color)
  values (new.id,
          coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1)),
          new.email,
          case when first_user then 'admin' else 'member' end,
          first_user,
          (array['#6366f1','#ec4899','#14b8a6','#f59e0b','#8b5cf6','#0ea5e9','#ef4444','#22c55e'])[1 + n % 8]);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ninguém (exceto admin) muda papel/aprovação; nunca sobra o quadro sem admin
create function public.protect_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    if new.role is distinct from old.role or new.approved is distinct from old.approved
       or new.email is distinct from old.email or new.id is distinct from old.id then
      raise exception 'Apenas administradores podem alterar permissões';
    end if;
  elsif old.role = 'admin' and old.approved and (new.role <> 'admin' or not new.approved)
        and not exists (select 1 from public.profiles where id <> old.id and role = 'admin' and approved) then
    raise exception 'Precisa existir ao menos um administrador';
  end if;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile();

/* ============ histórico de eventos (usado pelo diário) ============ */
create function public.log_event(p_task bigint, p_type text, p_data jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); last record;
begin
  if coalesce(current_setting('kanban.skip_events', true), '') = '1' then return; end if;
  if p_type in ('edited', 'worked') then
    select id, user_id, type, at into last from public.events where task_id = p_task order by id desc limit 1;
    if found and last.type = p_type and last.user_id is not distinct from uid and now() - last.at < interval '5 minutes' then
      update public.events set at = now() where id = last.id;
      return;
    end if;
  end if;
  insert into public.events(task_id, user_id, type, data) values (p_task, uid, p_type, p_data);
end $$;
revoke all on function public.log_event(bigint, text, jsonb) from public, anon, authenticated;

create function public.tasks_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare k text;
begin
  select kind into k from public.board_columns where id = new.column_id;
  new.creator_id := (select auth.uid());
  new.position := (select coalesce(max(position), -1) + 1 from public.tasks where column_id = new.column_id);
  new.completed_at := case when k = 'done' then now() end;
  return new;
end $$;
create trigger tasks_bi before insert on public.tasks for each row execute function public.tasks_before_insert();

create function public.tasks_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.log_event(new.id, 'created', jsonb_build_object('column', (select name from public.board_columns where id = new.column_id)));
  if new.assignee_id is not null then
    perform public.log_event(new.id, 'assigned', jsonb_build_object('to', new.assignee_id));
  end if;
  return new;
end $$;
create trigger tasks_ai after insert on public.tasks for each row execute function public.tasks_after_insert();

create function public.tasks_before_update() returns trigger
language plpgsql security definer set search_path = '' as $$
declare k record; fromname text;
begin
  if new.column_id is distinct from old.column_id then
    select * into k from public.board_columns where id = new.column_id;
    select name into fromname from public.board_columns where id = old.column_id;
    new.completed_at := case when k.kind = 'done' then coalesce(old.completed_at, now()) else null end;
    perform public.log_event(new.id, 'moved', jsonb_build_object('from', fromname, 'to', k.name, 'kind', k.kind));
    -- quem puxa uma task sem dono para "em andamento" fica com ela
    if k.kind = 'doing' and new.assignee_id is null then new.assignee_id := (select auth.uid()); end if;
  end if;
  if new.assignee_id is distinct from old.assignee_id then
    perform public.log_event(new.id, 'assigned', jsonb_build_object('to', new.assignee_id));
  end if;
  if (new.title, new.description, new.diary, new.priority, new.due_date, new.labels)
     is distinct from (old.title, old.description, old.diary, old.priority, old.due_date, old.labels) then
    perform public.log_event(new.id, 'edited');
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger tasks_bu before update on public.tasks for each row execute function public.tasks_before_update();

create function public.columns_before_insert() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.position := (select coalesce(max(position), -1) + 1 from public.board_columns);
  return new;
end $$;
create trigger columns_bi before insert on public.board_columns for each row execute function public.columns_before_insert();

/* ============ RPCs ============ */
create function public.move_task(p_task bigint, p_column bigint, p_before bigint default null)
returns void language plpgsql set search_path = '' as $$
declare arr bigint[]; idx int;
begin
  if not public.is_member() then raise exception 'Sem permissão'; end if;
  update public.tasks set column_id = p_column where id = p_task and column_id <> p_column;
  arr := array(select id from public.tasks where column_id = p_column and id <> p_task order by position, id);
  idx := case when p_before is null then null else array_position(arr, p_before) end;
  if idx is null then arr := arr || p_task; else arr := arr[1:idx - 1] || p_task || arr[idx:]; end if;
  update public.tasks t set position = o.ord - 1
    from unnest(arr) with ordinality as o(id, ord)
   where t.id = o.id and t.position is distinct from (o.ord - 1)::int;
end $$;

create function public.log_worked(p_task bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_member() then raise exception 'Sem permissão'; end if;
  if not exists (select 1 from public.tasks where id = p_task) then raise exception 'Task não encontrada'; end if;
  perform public.log_event(p_task, 'worked');
end $$;

create function public.move_column(p_id bigint, p_dir int) returns void
language plpgsql set search_path = '' as $$
declare arr bigint[]; i int; j int; tmp bigint;
begin
  if not public.is_member() then raise exception 'Sem permissão'; end if;
  arr := array(select id from public.board_columns order by position, id);
  i := array_position(arr, p_id); j := i + p_dir;
  if i is null or j < 1 or j > cardinality(arr) then return; end if;
  tmp := arr[i]; arr[i] := arr[j]; arr[j] := tmp;
  update public.board_columns c set position = o.ord - 1 from unnest(arr) with ordinality as o(id, ord) where c.id = o.id;
end $$;

create function public.delete_column(p_id bigint, p_move_to bigint default null) returns void
language plpgsql set search_path = '' as $$
declare n int; base int;
begin
  if not public.is_member() then raise exception 'Sem permissão'; end if;
  if (select count(*) from public.board_columns) <= 1 then raise exception 'O quadro precisa ter pelo menos uma coluna'; end if;
  select count(*) into n from public.tasks where column_id = p_id;
  if n > 0 then
    if p_move_to is null or p_move_to = p_id or not exists (select 1 from public.board_columns where id = p_move_to) then
      raise exception 'Escolha para onde levar as tasks desta coluna';
    end if;
    perform set_config('kanban.skip_events', '1', true);  -- mover em massa não vira "atividade" no diário
    select coalesce(max(position), -1) + 1 into base from public.tasks where column_id = p_move_to;
    update public.tasks t set column_id = p_move_to, position = base + s.rn - 1
      from (select id, row_number() over (order by position, id) rn from public.tasks where column_id = p_id) s
     where t.id = s.id;
  end if;
  delete from public.board_columns where id = p_id;
  update public.board_columns c set position = o.ord - 1
    from (select id, row_number() over (order by position, id) ord from public.board_columns) o where c.id = o.id;
end $$;

create function public.diary(p_from timestamptz, p_to timestamptz, p_team boolean default false, p_doing boolean default true)
returns table(id bigint, title text, diary text, column_name text, kind text, first_at timestamptz, source text)
language sql stable set search_path = '' as $$
  select * from (
    select t.id, t.title, t.diary, k.name, k.kind, min(e.at) as first_at, 'activity'::text as source
      from public.events e
      join public.tasks t on t.id = e.task_id
      join public.board_columns k on k.id = t.column_id
     where e.at between p_from and p_to and (p_team or e.user_id = (select auth.uid()))
     group by t.id, k.name, k.kind
    union all
    select t.id, t.title, t.diary, k.name, k.kind, t.created_at, 'doing'::text
      from public.tasks t join public.board_columns k on k.id = t.column_id
     where p_doing and k.kind = 'doing'
       and (case when p_team then t.assignee_id is not null else t.assignee_id = (select auth.uid()) end)
       and not exists (select 1 from public.events e where e.task_id = t.id and e.at between p_from and p_to
                       and (p_team or e.user_id = (select auth.uid())))
  ) x order by (x.source = 'doing'), x.first_at
$$;

revoke all on function public.move_task(bigint, bigint, bigint), public.log_worked(bigint), public.move_column(bigint, int),
  public.delete_column(bigint, bigint), public.diary(timestamptz, timestamptz, boolean, boolean) from public, anon;
grant execute on function public.move_task(bigint, bigint, bigint), public.log_worked(bigint), public.move_column(bigint, int),
  public.delete_column(bigint, bigint), public.diary(timestamptz, timestamptz, boolean, boolean) to authenticated;

/* ============ segurança (RLS) ============ */
alter table public.profiles       enable row level security;
alter table public.board_columns  enable row level security;
alter table public.tasks          enable row level security;
alter table public.events         enable row level security;

-- contas novas ficam "pendentes": só enxergam o próprio perfil até o admin aprovar
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_member());
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_update_admin on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy columns_all on public.board_columns for all to authenticated
  using (public.is_member()) with check (public.is_member());
create policy tasks_all on public.tasks for all to authenticated
  using (public.is_member()) with check (public.is_member());
create policy events_select on public.events for select to authenticated using (public.is_member());

revoke all on public.profiles, public.board_columns, public.tasks, public.events from anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.board_columns, public.tasks to authenticated;
grant select on public.events to authenticated;

/* ============ tempo real ============ */
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.tasks, public.board_columns, public.profiles;
  end if;
end $$;
