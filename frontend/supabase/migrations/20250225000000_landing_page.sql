-- Landing page content: one row per section, JSONB data (admin-editable, public read)
CREATE TABLE IF NOT EXISTS landing_page (
  section TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default sections (empty data so landing shows empty until admin fills)
INSERT INTO landing_page (section, data) VALUES
  ('transparency', '{"mission":"","ctaPrimary":{"label":"Active Bidding","url":"/login"},"ctaSecondary":{"label":"Supplemental / Bid Bulletins","url":"/login"}}'),
  ('bidding', '{"rows":[]}'),
  ('documents', '{"items":[]}'),
  ('planning', '{"app":{"title":"APP (Annual Procurement Plan)","description":"","url":""},"pmr":{"title":"PMR (Procurement Monitoring Report)","description":"","url":""}}'),
  ('vendor', '{"accreditationTitle":"Accreditation Portal","accreditationDescription":"","accreditationUrl":"/login","loginTitle":"Login for Registered Suppliers","loginDescription":"","loginUrl":"/login"}'),
  ('bac', '{"secretariatName":"Procurement Office","secretariatEmail":"procurement@wmsu.edu.ph","secretariatPhone":"991-1771","officeAddress":"Western Mindanao State University, Normal Road, Baliwasan, Zamboanga City","officeNote":""}')
ON CONFLICT (section) DO NOTHING;

ALTER TABLE landing_page ENABLE ROW LEVEL SECURITY;

-- Public can read (for unauthenticated landing page)
CREATE POLICY "Anyone can read landing_page" ON landing_page FOR SELECT TO anon, authenticated USING (true);
-- Only authenticated can update (admin check in app)
CREATE POLICY "Authenticated can update landing_page" ON landing_page FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can insert landing_page" ON landing_page FOR INSERT TO authenticated WITH CHECK (true);
