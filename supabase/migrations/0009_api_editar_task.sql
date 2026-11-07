-- API/MCP: editar uma task (título, descrição, texto do diário, prioridade, prazo, etiquetas, anotações, checklist, responsável).
-- SÓ ADICIONA uma função. Mesmo padrão de api_create_task/api_move_task (0006): checa se a pessoa é membro aprovado
-- do projeto e roda "em nome dela" (o gatilho tasks_bu registra o histórico/diário com o usuário certo).
-- p_patch é um jsonb só com os campos que mudam; campo ausente = não mexe.

create or replace function public.api_update_task(p_user uuid, p_task bigint, p_patch jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare pid bigint; cl jsonb;
begin
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  select project_id into pid from public.tasks where id = p_task and deleted_at is null;
  if pid is null or not exists (select 1 from public.profiles where id = p_user and approved)
     or not exists (select 1 from public.project_members where project_id = pid and user_id = p_user) then
    raise exception 'Sem acesso a esta task';
  end if;
  if jsonb_typeof(coalesce(p_patch, 'null')) <> 'object' then raise exception 'patch inválido'; end if;

  if p_patch ? 'checklist' then
    if jsonb_typeof(p_patch->'checklist') <> 'array' then raise exception 'checklist precisa ser uma lista'; end if;
    -- normaliza: só {text, done}, texto aparado (até 2000), sem itens vazios
    select coalesce(jsonb_agg(jsonb_build_object('text', left(trim(x->>'text'), 2000), 'done', coalesce((x->>'done')::boolean, false)) order by o), '[]'::jsonb)
      into cl
      from jsonb_array_elements(p_patch->'checklist') with ordinality as e(x, o)
     where jsonb_typeof(x) = 'object' and trim(coalesce(x->>'text', '')) <> '';
  end if;

  update public.tasks set
    title       = case when p_patch ? 'title' and trim(coalesce(p_patch->>'title', '')) <> '' then left(trim(p_patch->>'title'), 300) else title end,
    description = case when p_patch ? 'description' then left(coalesce(p_patch->>'description', ''), 10000) else description end,
    diary       = case when p_patch ? 'diary' then left(coalesce(p_patch->>'diary', ''), 500) else diary end,
    notes       = case when p_patch ? 'notes' then left(coalesce(p_patch->>'notes', ''), 20000) else notes end,
    priority    = case when p_patch ? 'priority' then greatest(0, least(3, (p_patch->>'priority')::int)) else priority end,
    due_date    = case when p_patch ? 'due_date' then nullif(p_patch->>'due_date', '')::date else due_date end,
    labels      = case when p_patch ? 'labels' and jsonb_typeof(p_patch->'labels') = 'array'
                    then coalesce((select array_agg(l) from (select distinct left(trim(x), 24) l from jsonb_array_elements_text(p_patch->'labels') x where trim(x) <> '' limit 8) s), '{}')
                    else labels end,
    checklist   = case when p_patch ? 'checklist' then cl else checklist end,
    assignee_id = case when p_patch ? 'assignee_id' then nullif(p_patch->>'assignee_id', '')::uuid else assignee_id end
  where id = p_task;
end $$;

revoke all on function public.api_update_task(uuid, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.api_update_task(uuid, bigint, jsonb) to service_role;
