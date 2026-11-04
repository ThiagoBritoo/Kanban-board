-- Checklist nas tasks, lixeira (exclusão com "desfazer"), comentários e cor por coluna.
-- Só adiciona coisas: o front antigo continua funcionando.

alter table public.tasks
  add column checklist  jsonb not null default '[]'::jsonb
    check (jsonb_typeof(checklist) = 'array' and jsonb_array_length(checklist) <= 50),
  add column deleted_at timestamptz;

alter table public.board_columns
  add column color text check (color is null or color ~ '^#[0-9a-fA-F]{6}$');

-- mexer no checklist conta como "editou" (entra no diário)
create or replace function public.tasks_before_update() returns trigger
language plpgsql security definer set search_path = '' as $$
declare k record; fromname text;
begin
  if new.column_id is distinct from old.column_id then
    select * into k from public.board_columns where id = new.column_id;
    select name into fromname from public.board_columns where id = old.column_id;
    new.completed_at := case when k.kind = 'done' then coalesce(old.completed_at, now()) else null end;
    perform public.log_event(new.id, 'moved', jsonb_build_object('from', fromname, 'to', k.name, 'kind', k.kind));
    if k.kind = 'doing' and new.assignee_id is null then new.assignee_id := (select auth.uid()); end if;
  end if;
  if new.assignee_id is distinct from old.assignee_id then
    perform public.log_event(new.id, 'assigned', jsonb_build_object('to', new.assignee_id));
  end if;
  if (new.title, new.description, new.diary, new.priority, new.due_date, new.labels, new.checklist)
     is distinct from (old.title, old.description, old.diary, old.priority, old.due_date, old.labels, old.checklist) then
    perform public.log_event(new.id, 'edited');
  end if;
  new.updated_at := now();
  return new;
end $$;

-- tasks na lixeira não entram na reordenação
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

create function public.add_comment(p_task bigint, p_text text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_member() then raise exception 'Sem permissão'; end if;
  p_text := trim(p_text);
  if p_text is null or p_text = '' or char_length(p_text) > 2000 then raise exception 'Comentário inválido (1 a 2000 caracteres)'; end if;
  if not exists (select 1 from public.tasks where id = p_task) then raise exception 'Task não encontrada'; end if;
  insert into public.events(task_id, user_id, type, data) values (p_task, (select auth.uid()), 'comment', jsonb_build_object('text', p_text));
end $$;
revoke all on function public.add_comment(bigint, text) from public, anon;
grant execute on function public.add_comment(bigint, text) to authenticated;

-- diário ignora o que está na lixeira
create or replace function public.diary(p_from timestamptz, p_to timestamptz, p_team boolean default false, p_doing boolean default true)
returns table(id bigint, title text, diary text, column_name text, kind text, first_at timestamptz, source text)
language sql stable set search_path = '' as $$
  select * from (
    select t.id, t.title, t.diary, k.name, k.kind, min(e.at) as first_at, 'activity'::text as source
      from public.events e
      join public.tasks t on t.id = e.task_id and t.deleted_at is null
      join public.board_columns k on k.id = t.column_id
     where e.at between p_from and p_to and (p_team or e.user_id = (select auth.uid()))
     group by t.id, k.name, k.kind
    union all
    select t.id, t.title, t.diary, k.name, k.kind, t.created_at, 'doing'::text
      from public.tasks t join public.board_columns k on k.id = t.column_id
     where p_doing and k.kind = 'doing' and t.deleted_at is null
       and (case when p_team then t.assignee_id is not null else t.assignee_id = (select auth.uid()) end)
       and not exists (select 1 from public.events e where e.task_id = t.id and e.at between p_from and p_to
                       and (p_team or e.user_id = (select auth.uid())))
  ) x order by (x.source = 'doing'), x.first_at
$$;
