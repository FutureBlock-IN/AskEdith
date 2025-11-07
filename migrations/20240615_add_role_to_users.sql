-- Add role column to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'user';

-- Create an index on the role column for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
