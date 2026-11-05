-- Checklist: limite de itens por task sobe de 50 para 150 (aplicada em 05/11 direto no Supabase).
alter table public.tasks drop constraint tasks_checklist_check;
alter table public.tasks add constraint tasks_checklist_check check (jsonb_typeof(checklist) = 'array' and jsonb_array_length(checklist) <= 150);
