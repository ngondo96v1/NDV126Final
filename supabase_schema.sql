-- SQL Schema for Supabase

-- 1. Table for Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  id_number TEXT,
  balance BIGINT DEFAULT 0,
  total_limit BIGINT DEFAULT 0,
  rank TEXT DEFAULT 'standard',
  rank_progress INTEGER DEFAULT 0,
  is_logged_in BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  pending_upgrade_rank TEXT,
  rank_upgrade_bill TEXT,
  address TEXT,
  join_date TEXT,
  id_front TEXT,
  id_back TEXT,
  ref_zalo TEXT,
  relationship TEXT,
  last_loan_seq INTEGER DEFAULT 0,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_holder TEXT,
  updated_at BIGINT
);

-- 2. Table for Loans
CREATE TABLE IF NOT EXISTS loans (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT,
  amount BIGINT NOT NULL,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL,
  fine BIGINT DEFAULT 0,
  bill_image TEXT,
  signature TEXT,
  rejection_reason TEXT,
  updated_at BIGINT
);

-- 3. Table for Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  time TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  type TEXT NOT NULL
);

-- 4. Table for System Config (Budget, Profit, etc.)
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- Initial System Data
INSERT INTO system_config (key, value) 
VALUES ('budget', '30000000')
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_config (key, value) 
VALUES ('rankProfit', '0')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS (Optional, but recommended if using Anon Key on Frontend)
-- For this setup, we use Service Role on Backend, so RLS can be disabled or configured.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Create policies for Admin (Service Role bypasses these)
-- For simplicity in this demo, we'll allow all for now or you can restrict.
