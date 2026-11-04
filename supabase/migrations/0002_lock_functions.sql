-- Funções internas (gatilhos) não precisam ser chamáveis pela API REST.
revoke all on function public.handle_new_user(), public.protect_profile(), public.tasks_before_insert(),
  public.tasks_after_insert(), public.tasks_before_update(), public.columns_before_insert()
  from public, anon, authenticated;

-- is_member/is_admin são usadas pelas políticas RLS (rodam como o usuário logado), então só "authenticated" precisa.
revoke all on function public.is_member(), public.is_admin() from public, anon;
grant execute on function public.is_member(), public.is_admin() to authenticated;
