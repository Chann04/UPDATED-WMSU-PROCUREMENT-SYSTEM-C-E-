-- =====================================================================
-- DIAGNOSE: "I submitted from Faculty, but College Admin doesn't see it"
--
-- RLS rule (see 20260420133000_requests_rls_and_atomic_workflow.sql):
--   A DeptHead may SELECT/UPDATE a request iff there exists a college
--   row where `colleges.handler_id = me.id` AND `colleges.name =
--   profiles.department` of the requester. Any mismatch (wrong role,
--   missing handler, trimmed/upper vs lower case, different spelling)
--   silently hides the request from the College Admin.
--
-- Run the queries below in the Supabase SQL Editor of project
-- pnosfyyskchwynsrdkhw to spot the mismatch.
-- =====================================================================

-- 1. What does each Pending/Approved request look like, and who can see it?
SELECT
  r.id                                   AS request_id,
  r.status,
  r.item_name,
  rp.email                               AS requester_email,
  rp.role                                AS requester_role,
  rp.department                          AS requester_department,
  c.name                                 AS matched_college_name,
  c.handler_id                           AS college_handler_id,
  hp.email                               AS college_admin_email,
  hp.role                                AS college_admin_role
FROM public.requests r
LEFT JOIN public.profiles rp ON rp.id = r.requester_id
LEFT JOIN public.colleges c  ON c.name = rp.department
LEFT JOIN public.profiles hp ON hp.id = c.handler_id
WHERE r.status IN ('Pending','Approved','Procuring','ProcurementDone','Received')
ORDER BY r.created_at DESC
LIMIT 50;

-- If `matched_college_name` is NULL, the faculty's profiles.department
-- doesn't exactly match any colleges.name. Fix either side.
-- If `college_handler_id` is NULL, no handler assigned. Assign one.
-- If `college_admin_role` is not 'DeptHead', flip the role.

-- 2. Show all colleges and their assigned handler (College Admin)
SELECT c.id, c.name, c.handler_id, p.email, p.role
FROM public.colleges c
LEFT JOIN public.profiles p ON p.id = c.handler_id
ORDER BY c.name;

-- 3. Show all Faculty profiles and what department they're set to
SELECT id, email, full_name, role, department, faculty_department
FROM public.profiles
WHERE role = 'Faculty'
ORDER BY email;

-- 4. Show all DeptHead profiles (the ones that should be college admins)
SELECT id, email, full_name, role, department
FROM public.profiles
WHERE role = 'DeptHead'
ORDER BY email;
