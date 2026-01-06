DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Grant permissions to Supabase roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

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
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role user_role DEFAULT 'user',
    avatar_url TEXT,
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

-- User commitments (assignments) - includes per-commitment streaks
CREATE TABLE user_commitments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    commitment_id UUID NOT NULL REFERENCES commitments(id) ON DELETE CASCADE,
    pending_carry_over INTEGER DEFAULT 0,
    total_completed INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
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

-- Holidays table (admin-managed)
CREATE TABLE holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    realm_id UUID NOT NULL REFERENCES realms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- NULL = realm-wide holiday
    date DATE NOT NULL,
    description TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_profiles_username ON profiles(username);
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
CREATE INDEX idx_holidays_realm_date ON holidays(realm_id, date);
CREATE INDEX idx_holidays_user_date ON holidays(user_id, date);
CREATE INDEX idx_holidays_date ON holidays(date);

-- Unique constraints to prevent duplicate holidays
-- Separate indexes for realm-wide and user-specific holidays (NULL ≠ NULL in SQL)
CREATE UNIQUE INDEX idx_holidays_unique_realm_wide ON holidays(realm_id, date) WHERE user_id IS NULL;
CREATE UNIQUE INDEX idx_holidays_unique_user_specific ON holidays(realm_id, user_id, date) WHERE user_id IS NOT NULL;

-- Row Level Security (RLS)
ALTER TABLE realms ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_realms ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_role user_role;
BEGIN
    SELECT role INTO user_role FROM profiles WHERE id = auth.uid();
    RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get email by username for login (bypasses RLS, public access)
CREATE OR REPLACE FUNCTION get_email_by_username(p_username TEXT)
RETURNS TEXT AS $$
DECLARE
    user_email TEXT;
BEGIN
    SELECT email INTO user_email FROM profiles WHERE username = p_username;
    RETURN user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's realm IDs (bypasses RLS to avoid circular dependency)
CREATE OR REPLACE FUNCTION get_user_realm_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT realm_id FROM user_realms WHERE user_id = auth.uid();
$$;

-- Realms policies
CREATE POLICY "Users can view their realms" ON realms
    FOR SELECT USING (
        id IN (SELECT get_user_realm_ids())
        OR is_admin()
    );

CREATE POLICY "Admins can manage realms" ON realms
    FOR ALL USING (is_admin());

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (is_admin());

CREATE POLICY "Users can view profiles in their realms" ON profiles
    FOR SELECT USING (
        id IN (SELECT user_id FROM user_realms WHERE realm_id IN (SELECT get_user_realm_ids()))
    );

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow insert for authenticated users" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- User realms policies
CREATE POLICY "Users can view members in their realms" ON user_realms
    FOR SELECT USING (
        realm_id IN (SELECT get_user_realm_ids())
        OR is_admin()
    );

CREATE POLICY "Admins can manage realm memberships" ON user_realms
    FOR ALL USING (is_admin());

CREATE POLICY "Users can join realms via invite" ON user_realms
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Invites policies
CREATE POLICY "Admins can manage invites" ON invites
    FOR ALL USING (is_admin());

CREATE POLICY "Anyone can read invites for registration" ON invites
    FOR SELECT USING (true);

-- Commitments policies
CREATE POLICY "Users can view commitments in their realms" ON commitments
    FOR SELECT USING (
        realm_id IN (SELECT get_user_realm_ids())
        OR is_admin()
    );

CREATE POLICY "Admins can manage commitments" ON commitments
    FOR ALL USING (is_admin());

-- User commitments policies
CREATE POLICY "Users can view commitments in their realms" ON user_commitments
    FOR SELECT USING (
        commitment_id IN (SELECT id FROM commitments WHERE realm_id IN (SELECT get_user_realm_ids()))
        OR is_admin()
    );

CREATE POLICY "Admins can manage user commitments" ON user_commitments
    FOR ALL USING (is_admin());

-- Daily logs policies
CREATE POLICY "Users can view logs in their realms" ON daily_logs
    FOR SELECT USING (
        commitment_id IN (SELECT id FROM commitments WHERE realm_id IN (SELECT get_user_realm_ids()))
        OR is_admin()
    );

CREATE POLICY "Users can insert own logs" ON daily_logs
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own pending or rejected logs" ON daily_logs
    FOR UPDATE USING (user_id = auth.uid() AND status IN ('pending', 'rejected'));

CREATE POLICY "Admins can update any log" ON daily_logs
    FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete logs" ON daily_logs
    FOR DELETE USING (is_admin());

-- Holidays policies
CREATE POLICY "Users can view holidays in their realms" ON holidays
    FOR SELECT USING (
        realm_id IN (SELECT get_user_realm_ids())
        OR is_admin()
    );

CREATE POLICY "Admins can manage holidays" ON holidays
    FOR ALL USING (is_admin());

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

CREATE TRIGGER holidays_updated_at
    BEFORE UPDATE ON holidays
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Make a user an admin (global, not tied to any realm)
-- CALL make_admin('admin', 'your-email@example.com', 'Your Name');
CREATE OR REPLACE PROCEDURE make_admin(
    admin_username TEXT,
    admin_email TEXT,
    admin_name TEXT
)
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

    -- Create or update profile as admin
    INSERT INTO profiles (id, username, email, name, role)
    VALUES (admin_id, admin_username, admin_email, admin_name, 'admin')
    ON CONFLICT (id) DO UPDATE SET role = 'admin', username = admin_username, name = admin_name;

    RAISE NOTICE 'Admin created successfully for %', admin_email;
END;
$$;

-- Create a new realm
-- SELECT create_realm('My Team', 'my-team');
CREATE OR REPLACE FUNCTION create_realm(
    realm_name TEXT,
    realm_slug TEXT
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    new_realm_id UUID;
BEGIN
    INSERT INTO realms (name, slug)
    VALUES (realm_name, realm_slug)
    RETURNING id INTO new_realm_id;

    RETURN new_realm_id;
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

-- Recalculate carry-over from a specific date forward
-- Used when retroactive holidays are created
CREATE OR REPLACE FUNCTION recalculate_carry_over_from_date(
    p_user_id UUID,
    p_commitment_id UUID,
    p_start_date DATE
)
RETURNS void AS $$
DECLARE
    log_record RECORD;
    current_carry_over INTEGER := 0;
    total_due INTEGER;
    completed INTEGER;
    missed INTEGER;
    punishment_mult DECIMAL;
    is_holiday_date BOOLEAN;
    realm_id_val UUID;
BEGIN
    -- Get commitment info
    SELECT c.punishment_multiplier, c.realm_id
    INTO punishment_mult, realm_id_val
    FROM commitments c
    JOIN user_commitments uc ON uc.commitment_id = c.id
    WHERE uc.user_id = p_user_id AND uc.commitment_id = p_commitment_id;

    -- If no user_commitment record exists, exit early (user not assigned to this commitment)
    IF punishment_mult IS NULL THEN
        RETURN;
    END IF;

    -- Get carry-over from the day before start_date
    SELECT COALESCE(carry_over_from_previous, 0) INTO current_carry_over
    FROM daily_logs
    WHERE user_id = p_user_id
      AND commitment_id = p_commitment_id
      AND date < p_start_date
    ORDER BY date DESC
    LIMIT 1;

    -- If no previous log, check user_commitments initial state
    IF current_carry_over IS NULL THEN
        SELECT COALESCE(pending_carry_over, 0) INTO current_carry_over
        FROM user_commitments
        WHERE user_id = p_user_id AND commitment_id = p_commitment_id;
    END IF;

    -- Process all logs from start_date forward in chronological order
    FOR log_record IN
        SELECT dl.*, c.daily_target
        FROM daily_logs dl
        JOIN commitments c ON c.id = dl.commitment_id
        WHERE dl.user_id = p_user_id
          AND dl.commitment_id = p_commitment_id
          AND dl.date >= p_start_date
        ORDER BY dl.date ASC
    LOOP
        -- Check if this date is a holiday
        SELECT EXISTS(
            SELECT 1 FROM holidays
            WHERE realm_id = realm_id_val
              AND date = log_record.date
              AND (user_id IS NULL OR user_id = p_user_id)
        ) INTO is_holiday_date;

        IF is_holiday_date THEN
            -- Delete the log for holiday dates (shouldn't exist)
            DELETE FROM daily_logs WHERE id = log_record.id;
            -- Carry-over stays the same, doesn't change
            CONTINUE;
        END IF;

        -- Update the log's carry_over_from_previous
        UPDATE daily_logs
        SET carry_over_from_previous = current_carry_over
        WHERE id = log_record.id;

        -- Calculate new carry-over based on this log
        total_due := log_record.daily_target + current_carry_over;
        completed := COALESCE(log_record.completed_amount, 0);
        missed := GREATEST(0, total_due - completed);

        IF missed > 0 THEN
            current_carry_over := (missed * punishment_mult)::INTEGER;
        ELSE
            current_carry_over := 0;
        END IF;
    END LOOP;

    -- Update user_commitments with final carry-over
    UPDATE user_commitments
    SET pending_carry_over = current_carry_over
    WHERE user_id = p_user_id AND commitment_id = p_commitment_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to recalculate carry-over when a retroactive holiday is created
CREATE OR REPLACE FUNCTION handle_retroactive_holiday()
RETURNS TRIGGER AS $$
DECLARE
    uc RECORD;
BEGIN
    -- Only process if the holiday is for a past date
    IF NEW.date >= CURRENT_DATE THEN
        RETURN NEW;
    END IF;

    -- Recalculate carry-over for all affected users
    IF NEW.user_id IS NULL THEN
        -- Realm-wide holiday: recalculate for all users in this realm
        FOR uc IN
            SELECT DISTINCT uc.user_id, uc.commitment_id
            FROM user_commitments uc
            JOIN commitments c ON c.id = uc.commitment_id
            WHERE c.realm_id = NEW.realm_id
        LOOP
            PERFORM recalculate_carry_over_from_date(
                uc.user_id,
                uc.commitment_id,
                NEW.date
            );
        END LOOP;
    ELSE
        -- User-specific holiday: recalculate for this user only
        FOR uc IN
            SELECT DISTINCT uc.commitment_id
            FROM user_commitments uc
            JOIN commitments c ON c.id = uc.commitment_id
            WHERE uc.user_id = NEW.user_id
              AND c.realm_id = NEW.realm_id
        LOOP
            PERFORM recalculate_carry_over_from_date(
                NEW.user_id,
                uc.commitment_id,
                NEW.date
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_retroactive_holiday
    AFTER INSERT ON holidays
    FOR EACH ROW
    EXECUTE FUNCTION handle_retroactive_holiday();

-- End of day processing function
-- Processes all user commitments: creates missing logs, calculates carry-over
-- Note: Streaks are updated on approval, not here
CREATE OR REPLACE FUNCTION process_end_of_day(p_date DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
DECLARE
    uc RECORD;
    existing_log RECORD;
    day_of_week INTEGER;
    is_active_day BOOLEAN;
    is_holiday BOOLEAN;
    total_due INTEGER;
    completed INTEGER;
    missed INTEGER;
    new_carry_over INTEGER;
BEGIN
    -- Get day of week (0 = Sunday, 1 = Monday, etc.)
    day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;

    -- Process each user_commitment
    FOR uc IN
        SELECT
            user_comm.id as uc_id,
            user_comm.user_id,
            user_comm.commitment_id,
            user_comm.pending_carry_over,
            user_comm.current_streak as uc_current_streak,
            user_comm.best_streak as uc_best_streak,
            c.daily_target,
            c.active_days,
            c.punishment_multiplier,
            c.realm_id
        FROM user_commitments user_comm
        JOIN commitments c ON c.id = user_comm.commitment_id
        WHERE c.is_active = true
    LOOP
        -- Check if today is an active day for this commitment
        is_active_day := day_of_week = ANY(uc.active_days);

        IF NOT is_active_day THEN
            CONTINUE; -- Skip non-active days
        END IF;

        -- Check if today is a holiday for this user
        -- Holiday is either realm-wide (user_id IS NULL) OR user-specific
        SELECT EXISTS(
            SELECT 1 FROM holidays
            WHERE realm_id = uc.realm_id
              AND date = p_date
              AND (user_id IS NULL OR user_id = uc.user_id)
        ) INTO is_holiday;

        IF is_holiday THEN
            CONTINUE; -- Skip holidays - no processing at all
        END IF;

        -- Get existing log for today
        SELECT * INTO existing_log
        FROM daily_logs
        WHERE user_id = uc.user_id
          AND commitment_id = uc.commitment_id
          AND date = p_date;

        -- Calculate totals
        total_due := uc.daily_target + COALESCE(uc.pending_carry_over, 0);

        IF existing_log IS NULL THEN
            -- No log exists - user didn't submit anything
            completed := 0;

            -- Create a log entry with 0 completed (auto-rejected)
            INSERT INTO daily_logs (
                user_id, commitment_id, date, target_amount,
                completed_amount, carry_over_from_previous, status
            ) VALUES (
                uc.user_id, uc.commitment_id, p_date, uc.daily_target,
                0, COALESCE(uc.pending_carry_over, 0), 'rejected'
            );
        ELSE
            -- Log exists
            completed := COALESCE(existing_log.completed_amount, 0);

            -- Auto-reject pending logs at end of day
            IF existing_log.status = 'pending' THEN
                UPDATE daily_logs
                SET status = 'rejected'
                WHERE id = existing_log.id;
            END IF;
        END IF;

        -- Calculate carry-over and update streak if missed
        missed := GREATEST(0, total_due - completed);

        IF missed > 0 THEN
            new_carry_over := (missed * uc.punishment_multiplier)::INTEGER;
            -- Reset streak to 0 when user misses their commitment
            UPDATE user_commitments
            SET pending_carry_over = new_carry_over,
                current_streak = 0
            WHERE id = uc.uc_id;
        ELSE
            new_carry_over := 0;
            -- No change to streak - it gets incremented on approval
            UPDATE user_commitments
            SET pending_carry_over = new_carry_over
            WHERE id = uc.uc_id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Clear any existing cron jobs for this app
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname LIKE 'daily-dues%';

-- Schedule end-of-day processing (21:00 UTC = 00:00 Bahrain time)
SELECT cron.schedule(
    'daily-dues-end-of-day',
    '0 21 * * *',
    $$SELECT process_end_of_day()$$
);

-- Try to create default admin (won't fail if user doesn't exist yet)
DO $$
BEGIN
    CALL make_admin('admin', 'admin@daily.dues', 'Admin');
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Admin user not found in auth.users - create user first then run: CALL make_admin(''admin'', ''admin@daily.dues'', ''Admin'');';
END;
$$;
