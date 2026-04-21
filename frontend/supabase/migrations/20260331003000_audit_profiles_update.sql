-- Audit: log when a user/profile gets edited

create or replace function public.audit_log_profiles_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only log meaningful edits (avoid spam from updated_at-only writes)
  if (
    new.full_name is distinct from old.full_name
    or new.email is distinct from old.email
    or new.role is distinct from old.role
    or new.department is distinct from old.department
    or new.approved_budget is distinct from old.approved_budget
  ) then
    insert into public.audit_events(actor_id, event_type, entity, entity_id, details)
    values (
      auth.uid(),
      'user_updated',
      'profiles',
      new.id,
      jsonb_build_object(
        'target_user_id', new.id,
        'before', jsonb_build_object(
          'full_name', old.full_name,
          'email', old.email,
          'role', old.role,
          'department', old.department,
          'approved_budget', old.approved_budget
        ),
        'after', jsonb_build_object(
          'full_name', new.full_name,
          'email', new.email,
          'role', new.role,
          'department', new.department,
          'approved_budget', new.approved_budget
        )
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_profiles_update on public.profiles;
create trigger trg_audit_profiles_update
after update on public.profiles
for each row
execute function public.audit_log_profiles_update();

notify pgrst, 'reload schema';

