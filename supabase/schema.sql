-- Daily Dues Database Schema
-- Run this in Supabase SQL Editor to set up your database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'user');
CREATE TYPE log_status AS ENUM ('pending', 'approved', 'rejected');

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role user_role DEFAULT 'user',
    avatar_url TEXT,
    total_completed INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invites table for invite-only registration
CREATE TABLE invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commitments table
CREATE TABLE commitments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    daily_target INTEGER NOT NULL,
    unit TEXT NOT NULL DEFAULT 'reps',
    active_days INTEGER[] DEFAULT ARRAY[0, 1, 2, 3, 4], -- Sunday-Thursday (Bahrain)
    punishment_multiplier DECIMAL(3,1) DEFAULT 2.0,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User commitments (assignments)
CREATE TABLE user_commitments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    commitment_id UUID NOT NULL REFERENCES commitments(id) ON DELETE CASCADE,
    pending_carry_over INTEGER DEFAULT 0, -- Carry-over to apply to next log
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, commitment_id)
);

-- Daily logs
CREATE TABLE daily_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    commitment_id UUID NOT NULL REFERENCES commitments(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    target_amount INTEGER NOT NULL,
    completed_amount INTEGER DEFAULT 0,
    carry_over_from_previous INTEGER DEFAULT 0,
    status log_status DEFAULT 'pending',
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, commitment_id, date)
);

-- Indexes for performance
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_invites_token ON invites(token);
CREATE INDEX idx_invites_email ON invites(email);
CREATE INDEX idx_daily_logs_user_date ON daily_logs(user_id, date);
CREATE INDEX idx_daily_logs_status ON daily_logs(status);
CREATE INDEX idx_user_commitments_user ON user_commitments(user_id);

-- Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow insert for authenticated users" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Invites policies
CREATE POLICY "Admins can manage invites" ON invites
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Anyone can read invites for registration" ON invites
    FOR SELECT USING (true);

-- Commitments policies
CREATE POLICY "Anyone can view commitments" ON commitments
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage commitments" ON commitments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- User commitments policies
CREATE POLICY "Users can view own commitments" ON user_commitments
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage user commitments" ON user_commitments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Daily logs policies
CREATE POLICY "Users can view own logs" ON daily_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all logs" ON daily_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users can insert own logs" ON daily_logs
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own pending logs" ON daily_logs
    FOR UPDATE USING (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins can update any log" ON daily_logs
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER commitments_updated_at
    BEFORE UPDATE ON commitments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER daily_logs_updated_at
    BEFORE UPDATE ON daily_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Create first admin user function (run once with your email)
-- CALL create_admin('your-email@example.com', 'Your Name');
CREATE OR REPLACE PROCEDURE create_admin(admin_email TEXT, admin_name TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
    admin_id UUID;
BEGIN
    -- Get the user id from auth.users
    SELECT id INTO admin_id FROM auth.users WHERE email = admin_email;

    IF admin_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found. Please sign up first.', admin_email;
    END IF;

    -- Update or insert profile as admin
    INSERT INTO profiles (id, email, name, role)
    VALUES (admin_id, admin_email, admin_name, 'admin')
    ON CONFLICT (id) DO UPDATE SET role = 'admin';

    RAISE NOTICE 'Admin created successfully for %', admin_email;
END;
$$;
