-- Add debt_repaid column to user_commitments for tracking debt repayment separately
-- This prevents gaming the system by intentionally breaking streaks to inflate total_completed

-- Add the new column
ALTER TABLE user_commitments ADD COLUMN IF NOT EXISTS debt_repaid INTEGER DEFAULT 0;

-- Backfill historical data: For all approved logs with carry_over_from_previous > 0,
-- we need to move the debt portion from total_completed to debt_repaid
DO $$
DECLARE
    uc RECORD;
    log_record RECORD;
    total_debt_for_user INTEGER;
    regular_portion INTEGER;
    debt_portion INTEGER;
BEGIN
    -- For each user_commitment, calculate how much of their total_completed was actually debt repayment
    FOR uc IN
        SELECT user_id, commitment_id, total_completed
        FROM user_commitments
    LOOP
        total_debt_for_user := 0;

        -- Process all approved logs for this user+commitment
        FOR log_record IN
            SELECT
                completed_amount,
                target_amount,
                carry_over_from_previous
            FROM daily_logs
            WHERE user_id = uc.user_id
              AND commitment_id = uc.commitment_id
              AND status = 'approved'
              AND carry_over_from_previous > 0
        LOOP
            -- Calculate how much of the completed amount was debt vs regular
            -- Regular portion is at most the daily target
            regular_portion := LEAST(log_record.completed_amount, log_record.target_amount);
            -- Debt portion is what's left after regular, up to the carry_over amount
            debt_portion := LEAST(
                GREATEST(0, log_record.completed_amount - log_record.target_amount),
                log_record.carry_over_from_previous
            );

            total_debt_for_user := total_debt_for_user + debt_portion;
        END LOOP;

        -- Update user_commitments: move debt portion from total_completed to debt_repaid
        IF total_debt_for_user > 0 THEN
            UPDATE user_commitments
            SET
                total_completed = total_completed - total_debt_for_user,
                debt_repaid = total_debt_for_user
            WHERE user_id = uc.user_id
              AND commitment_id = uc.commitment_id;
        END IF;
    END LOOP;
END $$;

-- Log the migration completion
DO $$
BEGIN
    RAISE NOTICE 'Debt bank migration completed successfully';
END $$;
