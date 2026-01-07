"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Commitment } from "@/types/database";

// Valid day numbers (0 = Sunday, 6 = Saturday)
const VALID_DAYS = [0, 1, 2, 3, 4, 5, 6];

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated", user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Only admins can manage commitments", user: null, profile: null };
  }

  return { error: null, user, profile };
}

export interface CreateCommitmentInput {
  name: string;
  description?: string;
  daily_target: number;
  unit: string;
  active_days: number[];
  punishment_multiplier: number;
  realm_id: string;
}

export interface CommitmentResult {
  success: boolean;
  error?: string;
  data?: Commitment;
}

export async function createCommitment(input: CreateCommitmentInput): Promise<CommitmentResult> {
  const supabase = await createClient();
  const { error: authError, user } = await verifyAdmin(supabase);

  if (authError || !user) {
    return { success: false, error: authError || "Not authenticated" };
  }

  // Validate inputs
  if (!input.name || input.name.trim().length === 0) {
    return { success: false, error: "Name is required" };
  }

  if (input.daily_target <= 0) {
    return { success: false, error: "Daily target must be positive" };
  }

  if (input.punishment_multiplier < 1) {
    return { success: false, error: "Punishment multiplier must be at least 1" };
  }

  if (!input.active_days || input.active_days.length === 0) {
    return { success: false, error: "At least one active day is required" };
  }

  // Validate active_days array
  const invalidDays = input.active_days.filter(d => !VALID_DAYS.includes(d));
  if (invalidDays.length > 0) {
    return { success: false, error: `Invalid day numbers: ${invalidDays.join(", ")}` };
  }

  // Verify realm exists
  const { data: realm } = await supabase
    .from("realms")
    .select("id")
    .eq("id", input.realm_id)
    .single();

  if (!realm) {
    return { success: false, error: "Realm not found" };
  }

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("commitments")
    .insert({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      daily_target: input.daily_target,
      unit: input.unit,
      active_days: input.active_days,
      punishment_multiplier: input.punishment_multiplier,
      realm_id: input.realm_id,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as Commitment };
}

export interface UpdateCommitmentInput {
  id: string;
  name?: string;
  description?: string;
  daily_target?: number;
  unit?: string;
  active_days?: number[];
  punishment_multiplier?: number;
}

export async function updateCommitment(input: UpdateCommitmentInput): Promise<CommitmentResult> {
  const supabase = await createClient();
  const { error: authError } = await verifyAdmin(supabase);

  if (authError) {
    return { success: false, error: authError };
  }

  // Validate inputs if provided
  if (input.name !== undefined && input.name.trim().length === 0) {
    return { success: false, error: "Name cannot be empty" };
  }

  if (input.daily_target !== undefined && input.daily_target <= 0) {
    return { success: false, error: "Daily target must be positive" };
  }

  if (input.punishment_multiplier !== undefined && input.punishment_multiplier < 1) {
    return { success: false, error: "Punishment multiplier must be at least 1" };
  }

  if (input.active_days !== undefined) {
    if (input.active_days.length === 0) {
      return { success: false, error: "At least one active day is required" };
    }
    const invalidDays = input.active_days.filter(d => !VALID_DAYS.includes(d));
    if (invalidDays.length > 0) {
      return { success: false, error: `Invalid day numbers: ${invalidDays.join(", ")}` };
    }
  }

  const adminClient = createAdminClient();

  // Verify commitment exists
  const { data: existing } = await adminClient
    .from("commitments")
    .select("id")
    .eq("id", input.id)
    .single();

  if (!existing) {
    return { success: false, error: "Commitment not found" };
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updateData.name = input.name.trim();
  if (input.description !== undefined) updateData.description = input.description?.trim() || null;
  if (input.daily_target !== undefined) updateData.daily_target = input.daily_target;
  if (input.unit !== undefined) updateData.unit = input.unit;
  if (input.active_days !== undefined) updateData.active_days = input.active_days;
  if (input.punishment_multiplier !== undefined) updateData.punishment_multiplier = input.punishment_multiplier;

  const { data, error } = await adminClient
    .from("commitments")
    .update(updateData)
    .eq("id", input.id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as Commitment };
}

export interface ToggleCommitmentInput {
  id: string;
  is_active: boolean;
}

export async function toggleCommitmentActive(input: ToggleCommitmentInput): Promise<CommitmentResult> {
  const supabase = await createClient();
  const { error: authError } = await verifyAdmin(supabase);

  if (authError) {
    return { success: false, error: authError };
  }

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("commitments")
    .update({ is_active: input.is_active })
    .eq("id", input.id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as Commitment };
}

export interface DeleteCommitmentResult {
  success: boolean;
  error?: string;
}

export async function deleteCommitment(id: string): Promise<DeleteCommitmentResult> {
  const supabase = await createClient();
  const { error: authError } = await verifyAdmin(supabase);

  if (authError) {
    return { success: false, error: authError };
  }

  const adminClient = createAdminClient();

  // Verify commitment exists
  const { data: existing } = await adminClient
    .from("commitments")
    .select("id")
    .eq("id", id)
    .single();

  if (!existing) {
    return { success: false, error: "Commitment not found" };
  }

  const { error } = await adminClient
    .from("commitments")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
