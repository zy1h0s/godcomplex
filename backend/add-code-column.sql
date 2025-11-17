-- Add code_content column to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS code_content TEXT DEFAULT '';
