-- Run this in your Supabase project's SQL Editor

-- 1. Panel users table
CREATE TABLE IF NOT EXISTS panel_users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    login text UNIQUE NOT NULL,
    password text NOT NULL,
    bound_ip text DEFAULT NULL,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE panel_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON panel_users;
CREATE POLICY "allow_all" ON panel_users FOR ALL USING (true) WITH CHECK (true);

-- 2. Banned IPs table
CREATE TABLE IF NOT EXISTS banned_ips (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    ip text UNIQUE NOT NULL,
    reason text DEFAULT NULL,
    banned_at timestamptz DEFAULT now()
);
ALTER TABLE banned_ips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON banned_ips;
CREATE POLICY "allow_all" ON banned_ips FOR ALL USING (true) WITH CHECK (true);

