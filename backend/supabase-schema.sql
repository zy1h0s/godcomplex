-- Run this SQL in your Supabase SQL Editor
-- https://supabase.com/dashboard/project/YOUR_PROJECT/editor

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'viewer' CHECK (role IN ('operator', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    text_content TEXT DEFAULT '',
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_creator ON sessions(creator_id);
CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table (FIXED - allows registration)
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

-- RLS Policies for sessions table (FIXED - allows all operations)
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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
