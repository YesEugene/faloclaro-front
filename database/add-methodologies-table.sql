-- Create admin_methodologies table for storing course and lesson methodologies
CREATE TABLE IF NOT EXISTS admin_methodologies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) UNIQUE NOT NULL, -- 'course', 'lesson', 'vocabulary'
  content TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert initial data
INSERT INTO admin_methodologies (type, content) VALUES
  ('course', 'Course methodology placeholder. Describe the philosophy and trajectory of the course here.'),
  ('lesson', 'Lesson methodology placeholder. Describe how each lesson is structured here.'),
  ('vocabulary', '{"used_words": []}')
ON CONFLICT (type) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_methodologies_type ON admin_methodologies(type);

-- Enable RLS
ALTER TABLE admin_methodologies ENABLE ROW LEVEL SECURITY;

-- Create policy: only admins can read and write
CREATE POLICY "Admins can manage methodologies"
  ON admin_methodologies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

