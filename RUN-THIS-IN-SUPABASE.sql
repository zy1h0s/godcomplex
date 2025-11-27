-- ============================================
-- COPY EVERYTHING BELOW AND RUN IN SUPABASE
-- ============================================

-- Step 1: Drop ALL existing policies (they're blocking everything)
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Anyone can register (insert new users)" ON users;
DROP POLICY IF EXISTS "Users can delete their own data" ON users;

DROP POLICY IF EXISTS "Anyone can view sessions" ON sessions;
DROP POLICY IF EXISTS "Authenticated users can create sessions" ON sessions;
DROP POLICY IF EXISTS "Anyone can create sessions" ON sessions;
DROP POLICY IF EXISTS "Creators and operators can update sessions" ON sessions;
DROP POLICY IF EXISTS "Anyone can update sessions" ON sessions;
DROP POLICY IF EXISTS "Creators can delete their sessions" ON sessions;
DROP POLICY IF EXISTS "Anyone can delete sessions" ON sessions;


CREATE POLICY "allow_all_select_users" ON users FOR SELECT USING (true);
CREATE POLICY "allow_all_insert_users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update_users" ON users FOR UPDATE USING (true);
CREATE POLICY "allow_all_delete_users" ON users FOR DELETE USING (true);


CREATE POLICY "allow_all_select_sessions" ON sessions FOR SELECT USING (true);
CREATE POLICY "allow_all_insert_sessions" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update_sessions" ON sessions FOR UPDATE USING (true);
CREATE POLICY "allow_all_delete_sessions" ON sessions FOR DELETE USING (true);
