-- Budget types allocation per college (DeptHead view)

create extension if not exists pgcrypto;

create table if not exists public.college_budget_types (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  fund_code text null,
  name text not null,
  amount numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_college_budget_types_college_id on public.college_budget_types(college_id);
create index if not exists idx_college_budget_types_created_at on public.college_budget_types(created_at desc);

-- Optional: prevent duplicate fund_code within a college when fund_code is provided
create unique index if not exists college_budget_types_unique_fund_code_per_college
on public.college_budget_types(college_id, fund_code)
where fund_code is not null and fund_code <> '';

alter table public.college_budget_types enable row level security;

drop policy if exists "Allow all for authenticated" on public.college_budget_types;
create policy "Allow all for authenticated"
on public.college_budget_types
for all
to authenticated
using (true)
with check (true);

grant all on table public.college_budget_types to authenticated;
grant all on table public.college_budget_types to service_role;

notify pgrst, 'reload schema';

