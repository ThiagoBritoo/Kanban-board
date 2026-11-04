-- Limite de tasks por coluna (WIP), cronômetro, ordenar coluna e anexos. Só adiciona coisas.

alter table public.board_columns
  add column wip_limit int check (wip_limit is null or wip_limit between 1 and 99);

alter table public.tasks
  add column time_spent int not null default 0 check (time_spent >= 0),   -- segundos acumulados
  add column timer_started_at timestamptz,
  add column timer_user uuid references public.profiles(id) on delete set null;

/* ---- cronômetro: iniciar/parar. Só um cronômetro rodando por pessoa. ---- */
create function public.toggle_timer(p_task bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); t record; secs int;
begin
  if not public.is_member() then raise exception 'Sem permissão'; end if;
  select * into t from public.tasks where id = p_task and deleted_at is null;
  if not found then raise exception 'Task não encontrada'; end if;
  if t.timer_started_at is not null then
    secs := greatest(0, extract(epoch from now() - t.timer_started_at)::int);
    update public.tasks set time_spent = time_spent + secs, timer_started_at = null, timer_user = null where id = p_task;
    perform public.log_event(p_task, 'timer', jsonb_build_object('action', 'stop', 'seconds', secs));
  else
    for t in select id, timer_started_at from public.tasks where timer_user = uid and timer_started_at is not null loop
      secs := greatest(0, extract(epoch from now() - t.timer_started_at)::int);
      update public.tasks set time_spent = time_spent + secs, timer_started_at = null, timer_user = null where id = t.id;
      perform public.log_event(t.id, 'timer', jsonb_build_object('action', 'stop', 'seconds', secs));
    end loop;
    update public.tasks set timer_started_at = now(), timer_user = uid where id = p_task;
    perform public.log_event(p_task, 'timer', jsonb_build_object('action', 'start'));
  end if;
end $$;
revoke all on function public.toggle_timer(bigint) from public, anon;
grant execute on function public.toggle_timer(bigint) to authenticated;

/* ---- ordenar uma coluna (o cliente manda a ordem desejada) ---- */
create function public.reorder_column(p_column bigint, p_ids bigint[]) returns void
language plpgsql set search_path = '' as $$
begin
  if not public.is_member() then raise exception 'Sem permissão'; end if;
  update public.tasks t set position = o.ord - 1
    from unnest(p_ids) with ordinality as o(id, ord)
   where t.id = o.id and t.column_id = p_column;
end $$;
revoke all on function public.reorder_column(bigint, bigint[]) from public, anon;
grant execute on function public.reorder_column(bigint, bigint[]) to authenticated;

/* ---- anexos ---- */
create table public.attachments (
  id         bigint generated always as identity primary key,
  task_id    bigint not null references public.tasks(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 200),
  path       text not null unique,
  size       bigint not null check (size >= 0),
  mime       text,
  user_id    uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index attachments_task on public.attachments(task_id);
alter table public.attachments enable row level security;
create policy attachments_select on public.attachments for select to authenticated using (public.is_member());
create policy attachments_insert on public.attachments for insert to authenticated
  with check (public.is_member() and user_id = (select auth.uid()));
create policy attachments_delete on public.attachments for delete to authenticated using (public.is_member());
revoke all on public.attachments from anon;
grant select, insert, delete on public.attachments to authenticated;

create function public.attachments_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.log_event(new.task_id, 'attachment', jsonb_build_object('name', new.name));
  return new;
end $$;
create trigger attachments_ai after insert on public.attachments for each row execute function public.attachments_after_insert();
revoke all on function public.attachments_after_insert() from public, anon, authenticated;

-- bucket privado (até 10 MB por arquivo); só membros aprovados leem/enviam/apagam
insert into storage.buckets (id, name, public, file_size_limit) values ('attachments', 'attachments', false, 10485760)
  on conflict (id) do nothing;
create policy attachments_obj_select on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and public.is_member());
create policy attachments_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and public.is_member());
create policy attachments_obj_delete on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and public.is_member());

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.attachments;
  end if;
end $$;
