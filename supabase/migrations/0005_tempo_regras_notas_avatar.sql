-- Tempo por datas (iniciada em / finalizada em), regras automáticas por coluna, colunas recolhidas,
-- anotações (gerais e por task), foto de perfil e tokens de API. SÓ ADICIONA coisas: o front antigo continua funcionando.

/* ============ tasks: datas de início/fim, "na coluna desde", anotações ============ */
alter table public.tasks
  add column started_at   timestamptz,
  add column finished_at  timestamptz,
  add column column_since timestamptz not null default now(),
  add column notes        text not null default '' check (char_length(notes) <= 20000);

/* ============ colunas: regra "depois de N dias vai para…" e "recolhida" ============ */
alter table public.board_columns
  add column auto_days int check (auto_days is null or auto_days between 1 and 365),
  add column auto_to   bigint references public.board_columns(id) on delete set null,
  add column collapsed boolean not null default false,
  add constraint board_columns_auto_not_self check (auto_to is null or auto_to <> id);

/* ============ preenche as datas das tasks que já existem (sem mexer em updated_at) ============ */
alter table public.tasks disable trigger tasks_bu;
update public.tasks t set
  started_at = coalesce(
    (select min(e.at) from public.events e where e.task_id = t.id and e.type = 'moved' and e.data->>'kind' = 'doing'),
    (select min(e.at) from public.events e where e.task_id = t.id and e.type = 'timer' and e.data->>'action' = 'start'),
    case when k.kind in ('doing', 'done') then t.created_at end),
  finished_at = case when k.kind = 'done' then t.completed_at end,
  column_since = coalesce((select max(e.at) from public.events e where e.task_id = t.id and e.type = 'moved'), t.created_at)
 from public.board_columns k where k.id = t.column_id;
alter table public.tasks enable trigger tasks_bu;

/* ============ gatilhos: o movimento entre colunas preenche/limpa as datas ============ */
create or replace function public.tasks_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare k text;
begin
  select kind into k from public.board_columns where id = new.column_id;
  new.creator_id := (select auth.uid());
  new.position := (select coalesce(max(position), -1) + 1 from public.tasks where column_id = new.column_id);
  new.completed_at := case when k = 'done' then now() end;
  new.column_since := now();
  new.started_at := case when k in ('doing', 'done') then now() end;
  new.finished_at := case when k = 'done' then now() end;
  return new;
end $$;

create or replace function public.tasks_before_update() returns trigger
language plpgsql security definer set search_path = '' as $$
declare k record; fromname text;
begin
  if new.column_id is distinct from old.column_id then
    select * into k from public.board_columns where id = new.column_id;
    select name into fromname from public.board_columns where id = old.column_id;
    new.column_since := now();
    if k.kind = 'done' then
      new.completed_at := coalesce(old.completed_at, now());
      new.finished_at  := coalesce(old.finished_at, now());   -- Concluído → Histórico mantém a data original
      new.started_at   := coalesce(old.started_at, now());
    else
      new.completed_at := null;
      new.finished_at  := null;                                -- voltou de concluída: limpa a finalização
      if k.kind = 'doing' then new.started_at := coalesce(old.started_at, now()); end if;
    end if;
    perform public.log_event(new.id, 'moved', jsonb_build_object('from', fromname, 'to', k.name, 'kind', k.kind));
    if k.kind = 'doing' and new.assignee_id is null then new.assignee_id := (select auth.uid()); end if;
  end if;
  if new.assignee_id is distinct from old.assignee_id then
    perform public.log_event(new.id, 'assigned', jsonb_build_object('to', new.assignee_id));
  end if;
  if (new.title, new.description, new.diary, new.priority, new.due_date, new.labels, new.checklist, new.notes)
     is distinct from (old.title, old.description, old.diary, old.priority, old.due_date, old.labels, old.checklist, old.notes) then
    perform public.log_event(new.id, 'edited');
  end if;
  new.updated_at := now();
  return new;
end $$;

/* ============ regras automáticas: "passou N dias nesta coluna → vai para outra" ============ */
create function public.apply_column_rules() returns int
language plpgsql security definer set search_path = '' as $$
declare c record; n int := 0; moved int; base int; toname text;
begin
  if not public.is_member() then raise exception 'Sem permissão'; end if;
  perform set_config('kanban.skip_events', '1', true);   -- o "moved" comum não entra no diário; registramos um evento próprio
  for c in select id, name, auto_days, auto_to from public.board_columns
            where auto_days is not null and auto_to is not null order by position, id loop
    select name into toname from public.board_columns where id = c.auto_to;
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
revoke all on function public.apply_column_rules() from public, anon;
grant execute on function public.apply_column_rules() to authenticated;

/* ============ anotações gerais (as anotações da task ficam em tasks.notes) ============ */
create table public.notes (
  id         bigint generated always as identity primary key,
  title      text not null default '' check (char_length(title) <= 120),
  body       text not null default '' check (char_length(body) <= 20000),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.notes enable row level security;
create policy notes_all on public.notes for all to authenticated using (public.is_member()) with check (public.is_member());
revoke all on public.notes from anon;
grant select, insert, update, delete on public.notes to authenticated;

/* ============ foto de perfil ============ */
alter table public.profiles add column avatar_url text check (avatar_url is null or char_length(avatar_url) <= 300);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do nothing;
-- leitura pública do bucket (as URLs têm nome aleatório); cada um só grava/apaga na própria pasta
create policy avatars_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_obj_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_obj_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

/* ============ tokens de API pessoais (para criar tasks de fora, ex.: pela IA no VS Code) ============ */
create table public.api_tokens (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  name         text not null check (char_length(name) between 1 and 60),
  token_hash   text not null unique,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);
alter table public.api_tokens enable row level security;
create policy api_tokens_select on public.api_tokens for select to authenticated using (user_id = (select auth.uid()));
create policy api_tokens_insert on public.api_tokens for insert to authenticated with check (user_id = (select auth.uid()) and public.is_member());
create policy api_tokens_delete on public.api_tokens for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.api_tokens from anon;
grant select, insert, delete on public.api_tokens to authenticated;

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notes;
  end if;
end $$;
