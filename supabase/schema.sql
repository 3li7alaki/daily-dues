-- Daily Dues Database Schema
-- Run this in Supabase SQL Editor to set up your database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'user');
CREATE TYPE log_status AS ENUM ('pending', 'approved', 'rejected');

-- Realms table (organizations/groups)
CREATE TABLE realms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    created_by UUID, -- Will be set after profiles table exists
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Add foreign key for realms.created_by after profiles exists
ALTER TABLE realms ADD CONSTRAINT realms_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- User-Realms junction table (users can be in multiple realms)
CREATE TABLE user_realms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    realm_id UUID NOT NULL REFERENCES realms(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, realm_id)
);

-- Invites table for invite-only registration
CREATE TABLE invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    realm_id UUID NOT NULL REFERENCES realms(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commitments table (realm-scoped)
CREATE TABLE commitments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    realm_id UUID NOT NULL REFERENCES realms(id) ON DELETE CASCADE,
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

-- User commitments (assignments) - now includes realm_id for clarity
CREATE TABLE user_commitments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    commitment_id UUID NOT NULL REFERENCES commitments(id) ON DELETE CASCADE,
    pending_carry_over INTEGER DEFAULT 0,
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
CREATE INDEX idx_user_realms_user ON user_realms(user_id);
CREATE INDEX idx_user_realms_realm ON user_realms(realm_id);
CREATE INDEX idx_invites_token ON invites(token);
CREATE INDEX idx_invites_email ON invites(email);
CREATE INDEX idx_invites_realm ON invites(realm_id);
CREATE INDEX idx_commitments_realm ON commitments(realm_id);
CREATE INDEX idx_daily_logs_user_date ON daily_logs(user_id, date);
CREATE INDEX idx_daily_logs_status ON daily_logs(status);
CREATE INDEX idx_user_commitments_user ON user_commitments(user_id);

-- Row Level Security (RLS)
ALTER TABLE realms ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_realms ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

-- Realms policies
CREATE POLICY "Users can view their realms" ON realms
    FOR SELECT USING (
        id IN (SELECT realm_id FROM user_realms WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can manage realms" ON realms
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Profiles policies
CREATE POLICY "Users can view profiles in their realms" ON profiles
    FOR SELECT USING (
        id IN (SELECT user_id FROM user_realms WHERE realm_id IN (SELECT realm_id FROM user_realms WHERE user_id = auth.uid()))
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        OR id = auth.uid()
    );

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow insert for authenticated users" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- User realms policies
CREATE POLICY "Users can view own realm memberships" ON user_realms
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all realm memberships" ON user_realms
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can manage realm memberships" ON user_realms
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users can join realms via invite" ON user_realms
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Invites policies
CREATE POLICY "Admins can manage invites" ON invites
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Anyone can read invites for registration" ON invites
    FOR SELECT USING (true);

-- Commitments policies
CREATE POLICY "Users can view commitments in their realms" ON commitments
    FOR SELECT USING (
        realm_id IN (SELECT realm_id FROM user_realms WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can manage commitments" ON commitments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- User commitments policies
CREATE POLICY "Users can view own commitments" ON user_commitments
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all user commitments" ON user_commitments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

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
CREATE TRIGGER realms_updated_at
    BEFORE UPDATE ON realms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER commitments_updated_at
    BEFORE UPDATE ON commitments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER daily_logs_updated_at
    BEFORE UPDATE ON daily_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Create first admin and realm function
-- CALL create_admin_with_realm('your-email@example.com', 'Your Name', 'My Team', 'my-team');
CREATE OR REPLACE PROCEDURE create_admin_with_realm(
    admin_email TEXT,
    admin_name TEXT,
    realm_name TEXT,
    realm_slug TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    admin_id UUID;
    new_realm_id UUID;
BEGIN
    -- Get the user id from auth.users
    SELECT id INTO admin_id FROM auth.users WHERE email = admin_email;

    IF admin_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found. Please sign up first.', admin_email;
    END IF;

    -- Create the realm
    INSERT INTO realms (name, slug, created_by)
    VALUES (realm_name, realm_slug, admin_id)
    RETURNING id INTO new_realm_id;

    -- Create or update profile as admin
    INSERT INTO profiles (id, email, name, role)
    VALUES (admin_id, admin_email, admin_name, 'admin')
    ON CONFLICT (id) DO UPDATE SET role = 'admin';

    -- Add admin to the realm
    INSERT INTO user_realms (user_id, realm_id)
    VALUES (admin_id, new_realm_id)
    ON CONFLICT (user_id, realm_id) DO NOTHING;

    RAISE NOTICE 'Admin created successfully for % in realm %', admin_email, realm_name;
END;
$$;

-- Helper function to get realm daily stats
CREATE OR REPLACE FUNCTION get_realm_daily_stats(p_realm_id UUID, p_date DATE)
RETURNS TABLE (
    total_users BIGINT,
    users_completed BIGINT,
    users_pending BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT ur.user_id) as total_users,
        COUNT(DISTINCT CASE WHEN dl.status = 'approved' THEN dl.user_id END) as users_completed,
        COUNT(DISTINCT CASE WHEN dl.status = 'pending' THEN dl.user_id END) as users_pending
    FROM user_realms ur
    JOIN profiles p ON p.id = ur.user_id
    LEFT JOIN daily_logs dl ON dl.user_id = ur.user_id AND dl.date = p_date
    WHERE ur.realm_id = p_realm_id AND p.role = 'user';
END;
$$ LANGUAGE plpgsql;
