-- Simple Carry-Over Test Script
-- Run each section separately in Supabase SQL Editor

-- ============================================================
-- STEP 1: Check if pg_cron extension exists
-- ============================================================
SELECT EXISTS(
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
) as pg_cron_installed;

--true

-- ============================================================
-- STEP 2: Check if the cron job is scheduled
-- ============================================================
SELECT
    jobid,
    schedule,
    command,
    jobname
FROM cron.job
WHERE jobname = 'daily-dues-end-of-day';

-- [
--   {
    -- "jobid": 4,
    -- "schedule": "0 21 * * *",
    -- "command": "SELECT process_end_of_day()",
    -- "jobname": "daily-dues-end-of-day"
--   }
-- ]

-- ============================================================
-- STEP 3: View current pending_carry_over values
-- ============================================================
SELECT
    p.name as user_name,
    c.name as commitment_name,
    c.daily_target,
    c.punishment_multiplier,
    uc.pending_carry_over as current_debt,
    uc.current_streak,
    uc.total_completed
FROM user_commitments uc
JOIN profiles p ON p.id = uc.user_id
JOIN commitments c ON c.id = uc.commitment_id
WHERE c.is_active = true
ORDER BY p.name, c.name;

-- [
--   {
--     "user_name": "Adam",
--     "commitment_name": "Push-ups",
--     "daily_target": 10,
--     "punishment_multiplier": "2.0",
--     "current_debt": 20,
--     "current_streak": 0,
--     "total_completed": 0
--   },
--   {
--     "user_name": "Ali AlHalaki",
--     "commitment_name": "Push-ups",
--     "daily_target": 10,
--     "punishment_multiplier": "2.0",
--     "current_debt": 0,
--     "current_streak": 2,
--     "total_completed": 20
--   },
--   {
--     "user_name": "Ali almadhoob",
--     "commitment_name": "Push-ups",
--     "daily_target": 10,
--     "punishment_multiplier": "2.0",
--     "current_debt": 0,
--     "current_streak": 2,
--     "total_completed": 20
--   },
--   {
--     "user_name": "Ali Alturabi ",
--     "commitment_name": "Push-ups",
--     "daily_target": 10,
--     "punishment_multiplier": "2.0",
--     "current_debt": 0,
--     "current_streak": 2,
--     "total_completed": 20
--   },
--   {
--     "user_name": "aliDakheel",
--     "commitment_name": "Push-ups",
--     "daily_target": 10,
--     "punishment_multiplier": "2.0",
--     "current_debt": 0,
--     "current_streak": 1,
--     "total_completed": 10
--   },
--   {
--     "user_name": "MJ",
--     "commitment_name": "Push-ups",
--     "daily_target": 10,
--     "punishment_multiplier": "2.0",
--     "current_debt": 0,
--     "current_streak": 1,
--     "total_completed": 10
--   },
--   {
--     "user_name": "Sayed Husain",
--     "commitment_name": "Push-ups",
--     "daily_target": 10,
--     "punishment_multiplier": "2.0",
--     "current_debt": 0,
--     "current_streak": 2,
--     "total_completed": 20
--   },
--   {
--     "user_name": "Yusuf",
--     "commitment_name": "Push-ups",
--     "daily_target": 10,
--     "punishment_multiplier": "2.0",
--     "current_debt": 0,
--     "current_streak": 1,
--     "total_completed": 10
--   },
--   {
--     "user_name": "Yusuf",
--     "commitment_name": "Push-ups",
--     "daily_target": 10,
--     "punishment_multiplier": "2.0",
--     "current_debt": 20,
--     "current_streak": 0,
--     "total_completed": 0
--   },
--   {
--     "user_name": "Zaza",
--     "commitment_name": "Push-ups",
--     "daily_target": 10,
--     "punishment_multiplier": "2.0",
--     "current_debt": 0,
--     "current_streak": 1,
--     "total_completed": 10
--   }
-- ]

-- ============================================================
-- STEP 4: View recent daily logs (last 3 days)
-- ============================================================
SELECT
    dl.date,
    p.name as user_name,
    c.name as commitment_name,
    dl.target_amount,
    dl.completed_amount,
    dl.carry_over_from_previous as had_debt,
    dl.status
FROM daily_logs dl
JOIN profiles p ON p.id = dl.user_id
JOIN commitments c ON c.id = dl.commitment_id
WHERE dl.date >= CURRENT_DATE - INTERVAL '3 days'
ORDER BY dl.date DESC, p.name;

-- [
--   {
--     "date": "2026-01-04",
--     "user_name": "Ali AlHalaki",
--     "commitment_name": "Push-ups",
--     "target_amount": 10,
--     "completed_amount": 10,
--     "had_debt": 0,
--     "status": "approved"
--   },
--   {
--     "date": "2026-01-04",
--     "user_name": "Ali almadhoob",
--     "commitment_name": "Push-ups",
--     "target_amount": 10,
--     "completed_amount": 10,
--     "had_debt": 0,
--     "status": "approved"
--   },
--   {
--     "date": "2026-01-04",
--     "user_name": "Ali Alturabi ",
--     "commitment_name": "Push-ups",
--     "target_amount": 10,
--     "completed_amount": 10,
--     "had_debt": 0,
--     "status": "approved"
--   },
--   {
--     "date": "2026-01-04",
--     "user_name": "Sayed Husain",
--     "commitment_name": "Push-ups",
--     "target_amount": 10,
--     "completed_amount": 10,
--     "had_debt": 0,
--     "status": "approved"
--   },
--   {
--     "date": "2026-01-04",
--     "user_name": "Yusuf",
--     "commitment_name": "Push-ups",
--     "target_amount": 10,
--     "completed_amount": 10,
--     "had_debt": 0,
--     "status": "approved"
--   },
--   {
--     "date": "2026-01-04",
--     "user_name": "Zaza",
--     "commitment_name": "Push-ups",
--     "target_amount": 10,
--     "completed_amount": 10,
--     "had_debt": 0,
--     "status": "rejected"
--   }
-- ]

-- ============================================================
-- STEP 5: Calculate what carry-over SHOULD be based on last log
-- ============================================================
WITH latest_logs AS (
    SELECT DISTINCT ON (dl.user_id, dl.commitment_id)
        dl.user_id,
        dl.commitment_id,
        dl.date,
        dl.target_amount,
        dl.completed_amount,
        dl.carry_over_from_previous,
        dl.status,
        c.punishment_multiplier,
        c.name as commitment_name,
        p.name as user_name
    FROM daily_logs dl
    JOIN commitments c ON c.id = dl.commitment_id
    JOIN profiles p ON p.id = dl.user_id
    WHERE c.is_active = true
    ORDER BY dl.user_id, dl.commitment_id, dl.date DESC
)
SELECT
    user_name,
    commitment_name,
    date as last_log_date,
    status as last_status,
    target_amount,
    completed_amount,
    carry_over_from_previous as had_debt,
    (target_amount + carry_over_from_previous) as total_due,
    GREATEST(0, (target_amount + carry_over_from_previous) - completed_amount) as missed,
    GREATEST(0, (target_amount + carry_over_from_previous) - completed_amount) * punishment_multiplier as calculated_debt
FROM latest_logs
ORDER BY user_name, commitment_name;

-- [
--   {
--     "user_name": "Ali AlHalaki",
--     "commitment_name": "Push-ups",
--     "last_log_date": "2026-01-04",
--     "last_status": "approved",
--     "target_amount": 10,
--     "completed_amount": 10,
--     "had_debt": 0,
--     "total_due": 10,
--     "missed": 0,
--     "calculated_debt": "0.0"
--   },
--   {
--     "user_name": "Ali almadhoob",
--     "commitment_name": "Push-ups",
--     "last_log_date": "2026-01-04",
--     "last_status": "approved",
--     "target_amount": 10,
--     "completed_amount": 10,
--     "had_debt": 0,
--     "total_due": 10,
--     "missed": 0,
--     "calculated_debt": "0.0"
--   },
--   {
--     "user_name": "Ali Alturabi ",
--     "commitment_name": "Push-ups",
--     "last_log_date": "2026-01-04",
--     "last_status": "approved",
--     "target_amount": 10,
--     "completed_amount": 10,
--     "had_debt": 0,
--     "total_due": 10,
--     "missed": 0,
--     "calculated_debt": "0.0"
--   },
--   {
--     "user_name": "aliDakheel",
--     "commitment_name": "Push-ups",
--     "last_log_date": "2025-12-31",
--     "last_status": "approved",
--     "target_amount": 10,
--     "completed_amount": 10,
--     "had_debt": 0,
--     "total_due": 10,
--     "missed": 0,
--     "calculated_debt": "0.0"
--   },
--   {
--     "user_name": "MJ",
--     "commitment_name": "Push-ups",
--     "last_log_date": "2025-12-31",
--     "last_status": "approved",
--     "target_amount": 10,
--     "completed_amount": 10,
--     "had_debt": 0,
--     "total_due": 10,
--     "missed": 0,
--     "calculated_debt": "0.0"
--   },
--   {
--     "user_name": "Sayed Husain",
--     "commitment_name": "Push-ups",
--     "last_log_date": "2026-01-04",
--     "last_status": "approved",
--     "target_amount": 10,
--     "completed_amount": 10,
--     "had_debt": 0,
--     "total_due": 10,
--     "missed": 0,
--     "calculated_debt": "0.0"
--   },
--   {
--     "user_name": "Yusuf",
--     "commitment_name": "Push-ups",
--     "last_log_date": "2026-01-04",
--     "last_status": "approved",
--     "target_amount": 10,
--     "completed_amount": 10,
--     "had_debt": 0,
--     "total_due": 10,
--     "missed": 0,
--     "calculated_debt": "0.0"
--   },
--   {
--     "user_name": "Zaza",
--     "commitment_name": "Push-ups",
--     "last_log_date": "2026-01-04",
--     "last_status": "rejected",
--     "target_amount": 10,
--     "completed_amount": 10,
--     "had_debt": 0,
--     "total_due": 10,
--     "missed": 0,
--     "calculated_debt": "0.0"
--   }
-- ]

-- ============================================================
-- STEP 6: MANUAL TEST - Process yesterday
-- This will actually run the end-of-day function for yesterday
-- Fixed: Cast to DATE type explicitly
-- ============================================================
SELECT process_end_of_day((CURRENT_DATE - INTERVAL '1 day')::DATE);

-- Previous error with INTERVAL (returns TIMESTAMP):
-- ERROR: 42883: function process_end_of_day(timestamp without time zone) does not exist

-- ============================================================
-- STEP 6B: Test the cron job command (without parameters)
-- This is what the actual cron job runs
-- ============================================================
SELECT process_end_of_day();

-- ============================================================
-- STEP 7: Check if it worked - view updated carry-over
-- Run STEP 3 again to see if debt was updated
-- ============================================================
SELECT
    p.name as user_name,
    c.name as commitment_name,
    uc.pending_carry_over as debt_after_manual_run,
    uc.current_streak
FROM user_commitments uc
JOIN profiles p ON p.id = uc.user_id
JOIN commitments c ON c.id = uc.commitment_id
WHERE c.is_active = true
ORDER BY p.name, c.name;

-- [
--   {
--     "user_name": "Adam",
--     "commitment_name": "Push-ups",
--     "debt_after_manual_run": 20,
--     "current_streak": 0
--   },
--   {
--     "user_name": "Ali AlHalaki",
--     "commitment_name": "Push-ups",
--     "debt_after_manual_run": 0,
--     "current_streak": 2
--   },
--   {
--     "user_name": "Ali almadhoob",
--     "commitment_name": "Push-ups",
--     "debt_after_manual_run": 0,
--     "current_streak": 2
--   },
--   {
--     "user_name": "Ali Alturabi ",
--     "commitment_name": "Push-ups",
--     "debt_after_manual_run": 0,
--     "current_streak": 2
--   },
--   {
--     "user_name": "aliDakheel",
--     "commitment_name": "Push-ups",
--     "debt_after_manual_run": 0,
--     "current_streak": 1
--   },
--   {
--     "user_name": "MJ",
--     "commitment_name": "Push-ups",
--     "debt_after_manual_run": 0,
--     "current_streak": 1
--   },
--   {
--     "user_name": "Sayed Husain",
--     "commitment_name": "Push-ups",
--     "debt_after_manual_run": 0,
--     "current_streak": 2
--   },
--   {
--     "user_name": "Yusuf",
--     "commitment_name": "Push-ups",
--     "debt_after_manual_run": 0,
--     "current_streak": 1
--   },
--   {
--     "user_name": "Yusuf",
--     "commitment_name": "Push-ups",
--     "debt_after_manual_run": 20,
--     "current_streak": 0
--   },
--   {
--     "user_name": "Zaza",
--     "commitment_name": "Push-ups",
--     "debt_after_manual_run": 0,
--     "current_streak": 1
--   }
-- ]