-- Migration: Add Challenges Feature
-- Run this in Supabase SQL Editor to add challenge functionality

-- Create challenge status enum
CREATE TYPE challenge_status AS ENUM ('active', 'archived');

-- Challenges table
CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    realm_id UUID NOT NULL REFERENCES realms(id) ON DELETE CASCADE,
    commitment_id UUID NOT NULL REFERENCES commitments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    duration_hours INTEGER NOT NULL CHECK (duration_hours > 0),
    max_units INTEGER NOT NULL CHECK (max_units > 0),
    status challenge_status DEFAULT 'active',
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ NOT NULL,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Timestamp when results were processed (reps added to totals + Slack sent)
    -- Used to prevent double-processing
    results_processed_at TIMESTAMPTZ
);

-- Challenge members (participants) table
CREATE TABLE challenge_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    -- votes stored as JSONB: { "voter_user_id": vote_count, ... }
    votes JSONB DEFAULT '{}'::jsonb,
    -- final_reps is calculated when challenge ends (minimum of votes with at least 2 voters)
    final_reps INTEGER,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(challenge_id, user_id)
);

-- Indexes
CREATE INDEX idx_challenges_realm ON challenges(realm_id);
CREATE INDEX idx_challenges_commitment ON challenges(commitment_id);
CREATE INDEX idx_challenges_status ON challenges(status);
CREATE INDEX idx_challenges_ends_at ON challenges(ends_at);
CREATE INDEX idx_challenge_members_challenge ON challenge_members(challenge_id);
CREATE INDEX idx_challenge_members_user ON challenge_members(user_id);
CREATE INDEX idx_challenge_members_votes ON challenge_members USING GIN (votes);

-- Trigger to set ends_at based on starts_at + duration_hours
CREATE OR REPLACE FUNCTION set_challenge_ends_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ends_at := NEW.starts_at + (NEW.duration_hours || ' hours')::INTERVAL;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER challenge_set_ends_at
    BEFORE INSERT OR UPDATE OF starts_at, duration_hours ON challenges
    FOR EACH ROW EXECUTE FUNCTION set_challenge_ends_at();

-- Trigger for updated_at on challenges
CREATE TRIGGER challenges_updated_at
    BEFORE UPDATE ON challenges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to validate vote updates (votes can only increase)
CREATE OR REPLACE FUNCTION validate_vote_update()
RETURNS TRIGGER AS $$
DECLARE
    old_vote INTEGER;
    new_vote INTEGER;
    voter_id TEXT;
    challenge_max_units INTEGER;
BEGIN
    -- Get challenge max_units
    SELECT max_units INTO challenge_max_units
    FROM challenges WHERE id = NEW.challenge_id;

    -- Check each vote in the new votes object
    FOR voter_id IN SELECT jsonb_object_keys(NEW.votes)
    LOOP
        new_vote := (NEW.votes->>voter_id)::INTEGER;
        old_vote := COALESCE((OLD.votes->>voter_id)::INTEGER, 0);

        -- Vote cannot be negative
        IF new_vote < 0 THEN
            RAISE EXCEPTION 'Votes cannot be negative';
        END IF;

        -- Vote can only increase
        IF new_vote < old_vote THEN
            RAISE EXCEPTION 'Votes can only be increased, not decreased. Voter: %, Old: %, New: %',
                voter_id, old_vote, new_vote;
        END IF;

        -- Validate vote doesn't exceed max_units
        IF new_vote > challenge_max_units THEN
            RAISE EXCEPTION 'Vote (%) exceeds challenge max_units (%)', new_vote, challenge_max_units;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_challenge_vote
    BEFORE UPDATE OF votes ON challenge_members
    FOR EACH ROW EXECUTE FUNCTION validate_vote_update();

-- Function to calculate final reps (minimum of votes with at least min_votes voters)
CREATE OR REPLACE FUNCTION calculate_final_reps(votes_json JSONB, min_votes INTEGER DEFAULT 2)
RETURNS INTEGER AS $$
DECLARE
    vote_count INTEGER;
    min_vote INTEGER;
    vote_values INTEGER[];
BEGIN
    -- Get number of voters
    SELECT COUNT(*) INTO vote_count FROM jsonb_object_keys(votes_json);

    -- Return NULL if not enough votes
    IF vote_count < min_votes THEN
        RETURN NULL;
    END IF;

    -- Get all vote values and find minimum
    SELECT ARRAY_AGG((value)::INTEGER) INTO vote_values
    FROM jsonb_each_text(votes_json);

    SELECT MIN(v) INTO min_vote FROM unnest(vote_values) AS v;

    RETURN min_vote;
END;
$$ LANGUAGE plpgsql;

-- Function to archive expired challenges and calculate final reps
CREATE OR REPLACE FUNCTION archive_expired_challenges()
RETURNS void AS $$
DECLARE
    challenge_record RECORD;
    member_record RECORD;
    final_reps_value INTEGER;
BEGIN
    -- Find and archive expired challenges
    FOR challenge_record IN
        SELECT id FROM challenges
        WHERE status = 'active' AND NOW() >= ends_at
    LOOP
        -- Update challenge status to archived
        UPDATE challenges
        SET status = 'archived'
        WHERE id = challenge_record.id;

        -- Calculate final reps for all members
        FOR member_record IN
            SELECT id, votes FROM challenge_members
            WHERE challenge_id = challenge_record.id
        LOOP
            final_reps_value := calculate_final_reps(member_record.votes, 2);

            UPDATE challenge_members
            SET final_reps = final_reps_value
            WHERE id = member_record.id;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule cron job to archive expired challenges (every 5 minutes)
SELECT cron.schedule(
    'daily-dues-archive-challenges',
    '*/5 * * * *',
    $$SELECT archive_expired_challenges()$$
);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_members ENABLE ROW LEVEL SECURITY;

-- Challenges policies
CREATE POLICY "Users can view challenges in their realms" ON challenges
    FOR SELECT USING (
        realm_id IN (SELECT get_user_realm_ids())
        OR is_admin()
    );

CREATE POLICY "Admins can insert challenges" ON challenges
    FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update challenges" ON challenges
    FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete challenges" ON challenges
    FOR DELETE USING (is_admin());

-- Challenge members policies
CREATE POLICY "Users can view challenge members in their realms" ON challenge_members
    FOR SELECT USING (
        challenge_id IN (
            SELECT id FROM challenges WHERE realm_id IN (SELECT get_user_realm_ids())
        )
        OR is_admin()
    );

CREATE POLICY "Users can join active challenges in their realms" ON challenge_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND challenge_id IN (
            SELECT id FROM challenges
            WHERE status = 'active'
            AND NOW() < ends_at
            AND realm_id IN (SELECT get_user_realm_ids())
        )
    );

CREATE POLICY "Users can update votes in active challenges" ON challenge_members
    FOR UPDATE USING (
        challenge_id IN (
            SELECT id FROM challenges
            WHERE status = 'active'
            AND NOW() < ends_at
            AND realm_id IN (SELECT get_user_realm_ids())
        )
        OR is_admin()
    );

CREATE POLICY "Admins can delete challenge members" ON challenge_members
    FOR DELETE USING (is_admin());

-- Grant permissions
GRANT ALL ON challenges TO authenticated;
GRANT ALL ON challenge_members TO authenticated;
