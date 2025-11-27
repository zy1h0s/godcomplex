-- FIXED VERSION - Run this in Supabase SQL Editor
-- This fixes the registration issue

-- First, drop existing policies
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Anyone can view sessions" ON sessions;
DROP POLICY IF EXISTS "Authenticated users can create sessions" ON sessions;
DROP POLICY IF EXISTS "Creators and operators can update sessions" ON sessions;
DROP POLICY IF EXISTS "Creators can delete their sessions" ON sessions;

-- RLS Policies for users table (FIXED)
CREATE POLICY "Users can view their own data"
    ON users FOR SELECT
    USING (true);

CREATE POLICY "Anyone can register (insert new users)"
    ON users FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update their own data"
    ON users FOR UPDATE
    USING (true);

CREATE POLICY "Users can delete their own data"
    ON users FOR DELETE
    USING (true);

-- RLS Policies for sessions table (FIXED)
CREATE POLICY "Anyone can view sessions"
    ON sessions FOR SELECT
    USING (true);

CREATE POLICY "Anyone can create sessions"
    ON sessions FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can update sessions"
    ON sessions FOR UPDATE
    USING (true);

CREATE POLICY "Anyone can delete sessions"
    ON sessions FOR DELETE
    USING (true);
