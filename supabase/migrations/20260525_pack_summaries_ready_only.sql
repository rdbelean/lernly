-- Restrict the dashboard pack list to finished packs. Cram-mode introduces
-- queued/processing/failed study_packs rows (empty pack_data) that must not
-- show as normal packs until Phase 3's grouped UI lands.
create or replace function public.list_pack_summaries()
returns table (
  id          uuid,
  title       text,
  exam_type   text,
  created_at  timestamptz,
  card_count  int
)
language sql
security definer
set search_path = public
as $$
  select
    sp.id,
    sp.title,
    sp.exam_type,
    sp.created_at,
    coalesce(jsonb_array_length(sp.pack_data->'flashcards'), 0)::int as card_count
  from public.study_packs sp
  where sp.user_id = auth.uid()
    and sp.status = 'ready'
  order by sp.created_at desc;
$$;

grant execute on function public.list_pack_summaries() to authenticated;
