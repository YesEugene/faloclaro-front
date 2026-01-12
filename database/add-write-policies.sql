-- Add write policies for importing data
-- Run this in Supabase SQL Editor

-- Allow INSERT for phrases (for import script)
CREATE POLICY "Allow insert for phrases" ON phrases
  FOR INSERT WITH CHECK (true);

-- Allow UPDATE for phrases (for import script)
CREATE POLICY "Allow update for phrases" ON phrases
  FOR UPDATE USING (true) WITH CHECK (true);

-- Allow INSERT for translations (for import script)
CREATE POLICY "Allow insert for translations" ON translations
  FOR INSERT WITH CHECK (true);

-- Allow UPDATE for translations (for import script)
CREATE POLICY "Allow update for translations" ON translations
  FOR UPDATE USING (true) WITH CHECK (true);

-- Allow INSERT for clusters (for import script)
CREATE POLICY "Allow insert for clusters" ON clusters
  FOR INSERT WITH CHECK (true);

-- Allow UPDATE for clusters (for import script)
CREATE POLICY "Allow update for clusters" ON clusters
  FOR UPDATE USING (true) WITH CHECK (true);









