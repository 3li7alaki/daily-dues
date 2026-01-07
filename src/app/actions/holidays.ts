"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Holiday } from "@/types/database";

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated", user: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Only admins can manage holidays", user: null };
  }

  return { error: null, user };
}

export interface CreateHolidayInput {
  realm_id: string;
  user_id?: string | null;
  date: string;
  description: string;
}

export interface HolidayResult {
  success: boolean;
  error?: string;
  data?: Holiday;
}

export async function createHoliday(input: CreateHolidayInput): Promise<HolidayResult> {
  const supabase = await createClient();
  const { error: authError, user } = await verifyAdmin(supabase);

  if (authError || !user) {
    return { success: false, error: authError || "Not authenticated" };
  }

  // Validate inputs
  if (!input.description || input.description.trim().length === 0) {
    return { success: false, error: "Description is required" };
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(input.date)) {
    return { success: false, error: "Invalid date format" };
  }

  const adminClient = createAdminClient();

  // Verify realm exists
  const { data: realm } = await adminClient
    .from("realms")
    .select("id")
    .eq("id", input.realm_id)
    .single();

  if (!realm) {
    return { success: false, error: "Realm not found" };
  }

  // If user-specific holiday, verify user exists
  if (input.user_id) {
    const { data: targetUser } = await adminClient
      .from("profiles")
      .select("id")
      .eq("id", input.user_id)
      .single();

    if (!targetUser) {
      return { success: false, error: "User not found" };
    }

    // Verify user is in the realm
    const { data: userRealm } = await adminClient
      .from("user_realms")
      .select("id")
      .eq("user_id", input.user_id)
      .eq("realm_id", input.realm_id)
      .single();

    if (!userRealm) {
      return { success: false, error: "User is not in this realm" };
    }
  }

  const { data, error } = await adminClient
    .from("holidays")
    .insert({
      realm_id: input.realm_id,
      user_id: input.user_id || null,
      date: input.date,
      description: input.description.trim(),
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    // Check for unique constraint violation
    if (error.code === "23505") {
      return { success: false, error: "A holiday already exists for this date" };
    }
    return { success: false, error: error.message };
  }

  return { success: true, data: data as Holiday };
}

export interface DeleteHolidayResult {
  success: boolean;
  error?: string;
}

export async function deleteHoliday(id: string): Promise<DeleteHolidayResult> {
  const supabase = await createClient();
  const { error: authError } = await verifyAdmin(supabase);

  if (authError) {
    return { success: false, error: authError };
  }

  const adminClient = createAdminClient();

  // Verify holiday exists
  const { data: existing } = await adminClient
    .from("holidays")
    .select("id")
    .eq("id", id)
    .single();

  if (!existing) {
    return { success: false, error: "Holiday not found" };
  }

  const { error } = await adminClient
    .from("holidays")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
