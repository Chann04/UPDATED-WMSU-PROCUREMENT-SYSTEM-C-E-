-- Seed the full set of WMSU colleges.
-- Safe to run multiple times (ON CONFLICT DO NOTHING on unique name).
-- No admin (handler_id) is assigned by default. Status is derived from handler_id
-- in the application layer (Active when assigned, Not Active when null).

INSERT INTO public.colleges (name, allocation_mode, allocation_value, is_active)
VALUES
  ('College of Law', 'percentage', 0, true),
  ('College of Agriculture', 'percentage', 0, true),
  ('College of Liberal Arts', 'percentage', 0, true),
  ('College of Architecture', 'percentage', 0, true),
  ('College of Nursing', 'percentage', 0, true),
  ('College of Asian & Islamic Studies', 'percentage', 0, true),
  ('College of Computing Studies', 'percentage', 0, true),
  ('College of Forestry & Environmental Studies', 'percentage', 0, true),
  ('College of Criminal Justice Education', 'percentage', 0, true),
  ('College of Home Economics', 'percentage', 0, true),
  ('College of Engineering', 'percentage', 0, true),
  ('College of Medicine', 'percentage', 0, true),
  ('College of Public Administration & Development Studies', 'percentage', 0, true),
  ('College of Sports Science & Physical Education', 'percentage', 0, true),
  ('College of Science and Mathematics', 'percentage', 0, true),
  ('College of Social Work & Community Development', 'percentage', 0, true),
  ('College of Teacher Education', 'percentage', 0, true),
  ('Professional Science Master''s Program', 'percentage', 0, true)
ON CONFLICT (name) DO NOTHING;

NOTIFY pgrst, 'reload schema';
