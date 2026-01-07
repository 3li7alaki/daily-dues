"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { calculateCarryOver } from "@/lib/carry-over";
import type { DailyLog } from "@/types/database";

export interface LogProgressInput {
  existingLogId?: string;
  commitmentId: string;
  date: string;
  completedAmount: number;
}

export interface LogProgressResult {
  success: boolean;
  error?: string;
  data?: DailyLog;
}

export async function logProgress(input: LogProgressInput): Promise<LogProgressResult> {
  const supabase = await createClient();

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Validate completedAmount is non-negative
  if (input.completedAmount < 0) {
    return { success: false, error: "Completed amount cannot be negative" };
  }

  // Get the user's commitment to validate and get target/carry-over
  const { data: userCommitment, error: ucError } = await supabase
    .from("user_commitments")
    .select("*, commitment:commitments(*)")
    .eq("user_id", user.id)
    .eq("commitment_id", input.commitmentId)
    .single();

  if (ucError || !userCommitment) {
    return { success: false, error: "Commitment not found or not assigned to you" };
  }

  const commitment = userCommitment.commitment;
  const targetAmount = commitment.daily_target;
  const carryOver = userCommitment.pending_carry_over || 0;
  const maxAllowed = targetAmount + carryOver;

  // Validate completedAmount doesn't exceed maximum
  if (input.completedAmount > maxAllowed) {
    return {
      success: false,
      error: `Completed amount (${input.completedAmount}) exceeds maximum allowed (${maxAllowed})`
    };
  }

  // Check if date is a holiday
  const { data: holiday } = await supabase
    .from("holidays")
    .select("id")
    .eq("realm_id", commitment.realm_id)
    .eq("date", input.date)
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .limit(1)
    .single();

  if (holiday) {
    return { success: false, error: "Cannot log progress on a holiday" };
  }

  if (input.existingLogId) {
    // Verify the log belongs to the user and is editable
    const { data: existingLog } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("id", input.existingLogId)
      .eq("user_id", user.id)
      .single();

    if (!existingLog) {
      return { success: false, error: "Log not found" };
    }

    if (existingLog.status === "approved") {
      return { success: false, error: "Cannot modify an approved log" };
    }

    // Update existing log
    const { data, error } = await supabase
      .from("daily_logs")
      .update({
        completed_amount: input.completedAmount,
        status: "pending",
        reviewed_by: null,
        reviewed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.existingLogId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as DailyLog };
  } else {
    // Check if log already exists for this date
    const { data: existingLog } = await supabase
      .from("daily_logs")
      .select("id")
      .eq("user_id", user.id)
      .eq("commitment_id", input.commitmentId)
      .eq("date", input.date)
      .single();

    if (existingLog) {
      return { success: false, error: "Log already exists for this date. Please update instead." };
    }

    // Create new log
    const { data, error } = await supabase
      .from("daily_logs")
      .insert({
        user_id: user.id,
        commitment_id: input.commitmentId,
        date: input.date,
        target_amount: targetAmount,
        completed_amount: input.completedAmount,
        carry_over_from_previous: carryOver,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as DailyLog };
  }
}

export interface ApproveLogInput {
  logId: string;
  approved: boolean;
}

export interface ApproveLogResult {
  success: boolean;
  error?: string;
}

export async function approveLog(input: ApproveLogInput): Promise<ApproveLogResult> {
  const supabase = await createClient();

  // Verify admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { success: false, error: "Only admins can approve logs" };
  }

  // Use admin client for the actual operations
  const adminClient = createAdminClient();

  // Get the log with commitment info
  const { data: log, error: logError } = await adminClient
    .from("daily_logs")
    .select("*, commitment:commitments(*)")
    .eq("id", input.logId)
    .single();

  if (logError || !log) {
    return { success: false, error: "Log not found" };
  }

  // Verify log is still pending
  if (log.status !== "pending") {
    return { success: false, error: "Log has already been processed" };
  }

  // Update log status
  const { error: updateError } = await adminClient
    .from("daily_logs")
    .update({
      status: input.approved ? "approved" : "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", input.logId)
    .eq("status", "pending"); // Extra safety

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  if (input.approved) {
    // Get current user_commitment stats
    const { data: userCommitment, error: ucError } = await adminClient
      .from("user_commitments")
      .select("*")
      .eq("user_id", log.user_id)
      .eq("commitment_id", log.commitment_id)
      .single();

    if (ucError || !userCommitment) {
      return { success: false, error: "User commitment not found" };
    }

    const totalDue = log.target_amount + log.carry_over_from_previous;
    const completed = log.completed_amount;
    const missed = Math.max(0, totalDue - completed);

    if (completed >= totalDue) {
      // Full completion - increment streak
      const newStreak = userCommitment.current_streak + 1;
      const { error: streakError } = await adminClient
        .from("user_commitments")
        .update({
          total_completed: userCommitment.total_completed + completed,
          current_streak: newStreak,
          best_streak: Math.max(userCommitment.best_streak, newStreak),
          pending_carry_over: 0,
        })
        .eq("user_id", log.user_id)
        .eq("commitment_id", log.commitment_id);

      if (streakError) {
        return { success: false, error: streakError.message };
      }
    } else {
      // Partial completion - reset streak, calculate carry-over
      const newCarryOver = calculateCarryOver(missed, log.commitment.punishment_multiplier);
      const { error: partialError } = await adminClient
        .from("user_commitments")
        .update({
          total_completed: userCommitment.total_completed + completed,
          current_streak: 0,
          pending_carry_over: newCarryOver,
        })
        .eq("user_id", log.user_id)
        .eq("commitment_id", log.commitment_id);

      if (partialError) {
        return { success: false, error: partialError.message };
      }
    }
  }

  return { success: true };
}
