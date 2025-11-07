-- Add role column to users table
ALTER TABLE users 
ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'user';

-- Create an index on the role column for faster lookups
CREATE INDEX idx_users_role ON users(role);

-- Optional: Update existing admin users if needed
-- UPDATE users SET role = 'admin' WHERE id IN ('user_id_1', 'user_id_2');
