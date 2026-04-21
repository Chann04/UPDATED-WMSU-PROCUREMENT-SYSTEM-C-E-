-- Enforce: one DeptHead (handler_id) can only be assigned to one college.
-- Allows multiple NULL handler_id values.

-- If duplicates already exist, keep the earliest college assignment
-- (by created_at, then id) and clear handler_id on the rest.
with ranked as (
  select
    id,
    handler_id,
    row_number() over (
      partition by handler_id
      order by created_at asc, id asc
    ) as rn
  from public.colleges
  where handler_id is not null
)
update public.colleges c
set handler_id = null
from ranked r
where c.id = r.id
  and r.rn > 1;

create unique index if not exists colleges_unique_handler_id
on public.colleges (handler_id)
where handler_id is not null;

notify pgrst, 'reload schema';

