-- Mobile helper for College Admin request list.
-- SECURITY DEFINER lets a signed-in DeptHead fetch requests from department users
-- in the handled college without requiring broad direct SELECT on public.profiles.

create or replace function public.mobile_get_college_requests()
returns setof public.requests
language plpgsql
security definer
set search_path = public
as $$
declare
  handled_college text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select c.name
    into handled_college
  from public.colleges c
  where c.handler_id = auth.uid()
  limit 1;

  if handled_college is null then
    select p.department
      into handled_college
    from public.profiles p
    where p.id = auth.uid()
    limit 1;
  end if;

  if handled_college is null then
    return;
  end if;

  return query
  select r.*
  from public.requests r
  where r.requester_id in (
    select p.id
    from public.profiles p
    where p.department = handled_college
  )
  order by r.created_at desc;
end;
$$;

grant execute on function public.mobile_get_college_requests() to authenticated;

notify pgrst, 'reload schema';
