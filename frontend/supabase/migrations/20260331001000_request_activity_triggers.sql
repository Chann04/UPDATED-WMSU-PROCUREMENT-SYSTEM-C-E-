-- Populate request_activity automatically (Logs page)

create extension if not exists pgcrypto;

create or replace function public.log_request_activity_for_requests()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- On insert: created
  if (tg_op = 'INSERT') then
    insert into public.request_activity (request_id, actor_id, action, details)
    values (
      new.id,
      auth.uid(),
      'created',
      jsonb_build_object(
        'status', new.status,
        'item_name', new.item_name
      )
    );
    return new;
  end if;

  -- On update: status change
  if (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    insert into public.request_activity (request_id, actor_id, action, details)
    values (
      new.id,
      auth.uid(),
      'status_changed',
      jsonb_build_object(
        'from', old.status,
        'to', new.status
      )
    );
  end if;

  -- On update: delegation change
  if (tg_op = 'UPDATE' and new.delegated_to is distinct from old.delegated_to) then
    insert into public.request_activity (request_id, actor_id, action, details)
    values (
      new.id,
      auth.uid(),
      'delegated',
      jsonb_build_object(
        'from', old.delegated_to,
        'to', new.delegated_to
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_log_request_activity_requests on public.requests;
create trigger trg_log_request_activity_requests
after insert or update on public.requests
for each row
execute function public.log_request_activity_for_requests();


create or replace function public.log_request_activity_for_comments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.request_activity (request_id, actor_id, action, details)
  values (
    new.request_id,
    auth.uid(),
    'comment_added',
    jsonb_build_object(
      'comment_id', new.id
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_log_request_activity_comments on public.request_comments;
create trigger trg_log_request_activity_comments
after insert on public.request_comments
for each row
execute function public.log_request_activity_for_comments();

notify pgrst, 'reload schema';

