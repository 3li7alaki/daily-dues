-- Debug Carry-Over Calculation Issue
-- Run this in Supabase SQL Editor to diagnose the problem

-- 1. Check if pg_cron extension is installed
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- 2. Check if the cron job is scheduled
SELECT
    jobid,
    schedule,
    command,
    jobname,
    active,
    database
FROM cron.job
WHERE jobname LIKE 'daily-dues%';

-- 3. Check cron job history (last 10 runs)
-- Note: If this fails, pg_cron might not be keeping history
SELECT *
FROM cron.job_run_details
ORDER BY runid DESC
LIMIT 10;

-- 4. Check current user_commitments with pending_carry_over
SELECT
    uc.id,
    p.name as user_name,
    c.name as commitment_name,
    c.daily_target,
    c.punishment_multiplier,
    uc.pending_carry_over,
    uc.current_streak,
    uc.total_completed
FROM user_commitments uc
JOIN profiles p ON p.id = uc.user_id
JOIN commitments c ON c.id = uc.commitment_id
WHERE c.is_active = true
ORDER BY p.name, c.name;

-- 5. Check recent daily_logs (last 7 days)
SELECT
    dl.date,
    p.name as user_name,
    c.name as commitment_name,
    dl.target_amount,
    dl.completed_amount,
    dl.carry_over_from_previous,
    dl.status,
    dl.created_at
FROM daily_logs dl
JOIN profiles p ON p.id = dl.user_id
JOIN commitments c ON c.id = dl.commitment_id
WHERE dl.date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY dl.date DESC, p.name, c.name;

-- 6. Manual test: Process end-of-day for yesterday
-- (This will show if the function works when called manually)
SELECT process_end_of_day(CURRENT_DATE - INTERVAL '1 day');

-- 7. Check if there are any holidays blocking carry-over
SELECT
    h.date,
    r.name as realm_name,
    COALESCE(p.name, 'ALL USERS') as user_name,
    h.description
FROM holidays h
JOIN realms r ON r.id = h.realm_id
LEFT JOIN profiles p ON p.id = h.user_id
WHERE h.date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY h.date DESC;

-- 8. Calculate what the carry-over SHOULD be for each user
-- (Compare this with actual pending_carry_over values)
WITH latest_logs AS (
    SELECT DISTINCT ON (dl.user_id, dl.commitment_id)
        dl.user_id,
        dl.commitment_id,
        dl.date,
        dl.target_amount,
        dl.completed_amount,
        dl.carry_over_from_previous,
        dl.status,
        c.punishment_multiplier
    FROM daily_logs dl
    JOIN commitments c ON c.id = dl.commitment_id
    WHERE c.is_active = true
    ORDER BY dl.user_id, dl.commitment_id, dl.date DESC
)
SELECT
    p.name as user_name,
    c.name as commitment_name,
    ll.date as last_log_date,
    ll.status as last_log_status,
    ll.target_amount,
    ll.completed_amount,
    ll.carry_over_from_previous,
    (ll.target_amount + ll.carry_over_from_previous) - ll.completed_amount as missed,
    ((ll.target_amount + ll.carry_over_from_previous) - ll.completed_amount) * ll.punishment_multiplier as calculated_carry_over,
    uc.pending_carry_over as actual_carry_over,
    CASE
        WHEN uc.pending_carry_over != ((ll.target_amount + ll.carry_over_from_previous) - ll.completed_amount) * ll.punishment_multiplier
        THEN '❌ MISMATCH'
        ELSE '✓ Match'
    END as status
FROM latest_logs ll
JOIN profiles p ON p.id = ll.user_id
JOIN commitments c ON c.id = ll.commitment_id
JOIN user_commitments uc ON uc.user_id = ll.user_id AND uc.commitment_id = ll.commitment_id
ORDER BY p.name, c.name;
