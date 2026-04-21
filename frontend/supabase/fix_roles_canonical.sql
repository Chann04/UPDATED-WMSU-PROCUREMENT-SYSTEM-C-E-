-- Optional: normalize role values in DB to match app (Admin, Faculty, DeptHead)
-- Run once in Supabase SQL Editor if old rows used lowercase.

UPDATE public.profiles SET role = 'Admin'  WHERE lower(trim(role)) = 'admin';
UPDATE public.profiles SET role = 'Faculty' WHERE lower(trim(role)) = 'faculty';
UPDATE public.profiles SET role = 'DeptHead' WHERE lower(trim(role)) IN ('depthead', 'dept_head', 'dept head');
