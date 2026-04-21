-- Generic audit events (logins, account creation, colleges CRUD, etc.)

create extension if not exists pgcrypto;

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_id uuid null references public.profiles(id) on delete set null,
  event_type text not null,
  entity text null,
  entity_id uuid null,
  details jsonb null default '{}'::jsonb
);

create index if not exists idx_audit_events_created_at on public.audit_events(created_at desc);
create index if not exists idx_audit_events_actor_id on public.audit_events(actor_id);

alter table public.audit_events enable row level security;

drop policy if exists "audit_events_select_authenticated" on public.audit_events;
create policy "audit_events_select_authenticated"
on public.audit_events
for select
to authenticated
using (true);

drop policy if exists "audit_events_insert_own" on public.audit_events;
create policy "audit_events_insert_own"
on public.audit_events
for insert
to authenticated
with check (actor_id is null or actor_id = auth.uid());

grant all on table public.audit_events to authenticated;
grant all on table public.audit_events to service_role;

-- Trigger helpers
create or replace function public.audit_log_colleges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.audit_events(actor_id, event_type, entity, entity_id, details)
    values (auth.uid(), 'college_created', 'colleges', new.id, jsonb_build_object('name', new.name));
    return new;
  elsif (tg_op = 'UPDATE') then
    insert into public.audit_events(actor_id, event_type, entity, entity_id, details)
    values (
      auth.uid(),
      'college_updated',
      'colleges',
      new.id,
      jsonb_build_object(
        'before', jsonb_build_object('name', old.name, 'handler_id', old.handler_id, 'allocation_mode', old.allocation_mode, 'allocation_value', old.allocation_value, 'is_active', old.is_active),
        'after',  jsonb_build_object('name', new.name, 'handler_id', new.handler_id, 'allocation_mode', new.allocation_mode, 'allocation_value', new.allocation_value, 'is_active', new.is_active)
      )
    );
    return new;
  elsif (tg_op = 'DELETE') then
    insert into public.audit_events(actor_id, event_type, entity, entity_id, details)
    values (auth.uid(), 'college_deleted', 'colleges', old.id, jsonb_build_object('name', old.name));
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_audit_colleges on public.colleges;
create trigger trg_audit_colleges
after insert or update or delete on public.colleges
for each row execute function public.audit_log_colleges();

create or replace function public.audit_log_profiles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.audit_events(actor_id, event_type, entity, entity_id, details)
    values (new.id, 'account_created', 'profiles', new.id, jsonb_build_object('email', new.email, 'role', new.role, 'department', new.department));
    return new;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_profiles on public.profiles;
create trigger trg_audit_profiles
after insert on public.profiles
for each row execute function public.audit_log_profiles();

notify pgrst, 'reload schema';

