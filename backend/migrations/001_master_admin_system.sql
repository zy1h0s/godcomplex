-- Master Admin System Migration
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/kfcertiewjczoxekmkib/editor

-- ========================================
-- STEP 1: Backup existing data (optional but recommended)
-- ========================================
-- CREATE TABLE users_backup AS SELECT * FROM users;
-- CREATE TABLE sessions_backup AS SELECT * FROM sessions;

-- ========================================
-- STEP 2: Add new columns to users table
-- ========================================

-- Add user_type column (admin, operator, candidate)
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'candidate' CHECK (user_type IN ('admin', 'operator', 'candidate'));

-- Add created_by column to track who created this user
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add is_active column for deactivation
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing users to operator type (backward compatibility)
UPDATE users SET user_type = 'operator' WHERE role = 'operator';
UPDATE users SET user_type = 'operator' WHERE role = 'viewer'; -- Viewers become operators

-- Drop old role column (after migration)
ALTER TABLE users DROP COLUMN IF EXISTS role;

-- ========================================
-- STEP 3: Create operator_candidates mapping table
-- ========================================

CREATE TABLE IF NOT EXISTS operator_candidates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  candidate_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(operator_id, candidate_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_operator_candidates_operator ON operator_candidates(operator_id);
CREATE INDEX IF NOT EXISTS idx_operator_candidates_candidate ON operator_candidates(candidate_id);
CREATE INDEX IF NOT EXISTS idx_operator_candidates_session ON operator_candidates(session_id);

-- ========================================
-- STEP 4: Add code_content column to sessions if missing
-- ========================================

ALTER TABLE sessions 
  ADD COLUMN IF NOT EXISTS code_content TEXT DEFAULT '';

-- ========================================
-- STEP 5: Update RLS Policies
-- ========================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Anyone can register (insert new users)" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Users can delete their own data" ON users;

DROP POLICY IF EXISTS "Anyone can view sessions" ON sessions;
DROP POLICY IF EXISTS "Anyone can create sessions" ON sessions;
DROP POLICY IF EXISTS "Anyone can update sessions" ON sessions;
DROP POLICY IF EXISTS "Anyone can delete sessions" ON sessions;

-- New RLS Policies for users table
CREATE POLICY "Admins can do everything on users"
  ON users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() AND u.user_type = 'admin'
    )
  );

CREATE POLICY "Operators can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() AND u.user_type IN ('operator', 'admin')
    )
  );

CREATE POLICY "Operators can create candidates"
  ON users FOR INSERT
  WITH CHECK (
    user_type = 'candidate' AND
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() AND u.user_type IN ('operator', 'admin')
    )
  );

CREATE POLICY "Operators can update their own candidates"
  ON users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() AND (
        u.user_type = 'admin' OR
        (u.user_type = 'operator' AND users.created_by = u.id)
      )
    )
  );

CREATE POLICY "Operators can delete their own candidates"
  ON users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() AND (
        u.user_type = 'admin' OR
        (u.user_type = 'operator' AND users.created_by = u.id)
      )
    )
  );

CREATE POLICY "Everyone can view their own user data"
  ON users FOR SELECT
  USING (id = auth.uid());

-- New RLS Policies for sessions table
CREATE POLICY "Admins can do everything on sessions"
  ON sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() AND u.user_type = 'admin'
    )
  );

CREATE POLICY "Operators can view their sessions"
  ON sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() AND u.user_type IN ('operator', 'admin')
    ) OR
    creator_id = auth.uid()
  );

CREATE POLICY "Operators can create sessions"
  ON sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() AND u.user_type IN ('operator', 'admin')
    )
  );

CREATE POLICY "Operators can update their sessions"
  ON sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() AND (
        u.user_type = 'admin' OR
        (u.user_type = 'operator' AND sessions.creator_id = u.id)
      )
    )
  );

CREATE POLICY "Operators can delete their sessions"
  ON sessions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() AND (
        u.user_type = 'admin' OR
        (u.user_type = 'operator' AND sessions.creator_id = u.id)
      )
    )
  );

-- New RLS Policies for operator_candidates table
ALTER TABLE operator_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators can view their own mappings"
  ON operator_candidates FOR SELECT
  USING (
    operator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() AND u.user_type = 'admin'
    )
  );

CREATE POLICY "Operators can create mappings"
  ON operator_candidates FOR INSERT
  WITH CHECK (
    operator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() AND u.user_type = 'admin'
    )
  );

CREATE POLICY "Operators can update their mappings"
  ON operator_candidates FOR UPDATE
  USING (
    operator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() AND u.user_type = 'admin'
    )
  );

CREATE POLICY "Operators can delete their mappings"
  ON operator_candidates FOR DELETE
  USING (
    operator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() AND u.user_type = 'admin'
    )
  );

-- ========================================
-- STEP 6: Add trigger for operator_candidates updated_at
-- ========================================

CREATE TRIGGER update_operator_candidates_updated_at 
  BEFORE UPDATE ON operator_candidates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- STEP 7: Create initial admin user
-- ========================================

-- NOTE: Replace 'admin' and 'your-secure-password' with your desired credentials
-- Password will be hashed by the backend on first login attempt
INSERT INTO users (username, email, password, user_type, is_active)
VALUES (
  'admin',
  'admin@godcomplex.com',
  '$2a$10$YourHashedPasswordHere', -- This will be replaced by backend hashing
  'admin',
  true
)
ON CONFLICT (username) DO NOTHING;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================

-- Verify migration
SELECT 
  'users' as table_name,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE user_type = 'admin') as admin_count,
  COUNT(*) FILTER (WHERE user_type = 'operator') as operator_count,
  COUNT(*) FILTER (WHERE user_type = 'candidate') as candidate_count
FROM users

UNION ALL

SELECT 
  'sessions' as table_name,
  COUNT(*) as total_count,
  NULL as admin_count,
  NULL as operator_count,
  NULL as candidate_count
FROM sessions

UNION ALL

SELECT 
  'operator_candidates' as table_name,
  COUNT(*) as total_count,
  NULL as admin_count,
  NULL as operator_count,
  NULL as candidate_count
FROM operator_candidates;
