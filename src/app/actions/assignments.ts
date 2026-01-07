"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

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
    return { error: "Only admins can manage assignments", user: null };
  }

  return { error: null, user };
}

export interface AssignUserCommitmentsInput {
  userId: string;
  commitmentIds: string[];
}

export interface AssignUserCommitmentsResult {
  success: boolean;
  error?: string;
}

export async function assignUserCommitments(
  input: AssignUserCommitmentsInput
): Promise<AssignUserCommitmentsResult> {
  const supabase = await createClient();
  const { error: authError } = await verifyAdmin(supabase);

  if (authError) {
    return { success: false, error: authError };
  }

  const adminClient = createAdminClient();

  // Verify user exists
  const { data: targetUser } = await adminClient
    .from("profiles")
    .select("id")
    .eq("id", input.userId)
    .single();

  if (!targetUser) {
    return { success: false, error: "User not found" };
  }

  // Verify all commitments exist
  if (input.commitmentIds.length > 0) {
    const { data: commitments } = await adminClient
      .from("commitments")
      .select("id")
      .in("id", input.commitmentIds);

    if (!commitments || commitments.length !== input.commitmentIds.length) {
      return { success: false, error: "One or more commitments not found" };
    }
  }

  // Get current assignments
  const { data: current } = await adminClient
    .from("user_commitments")
    .select("commitment_id")
    .eq("user_id", input.userId);

  const currentIds = new Set(current?.map((c) => c.commitment_id) || []);
  const newIds = new Set(input.commitmentIds);

  // Find what to remove and what to add
  const toRemove = [...currentIds].filter((id) => !newIds.has(id));
  const toAdd = input.commitmentIds.filter((id) => !currentIds.has(id));

  // Remove unselected commitments
  if (toRemove.length > 0) {
    const { error } = await adminClient
      .from("user_commitments")
      .delete()
      .eq("user_id", input.userId)
      .in("commitment_id", toRemove);

    if (error) {
      return { success: false, error: error.message };
    }
  }

  // Add new commitments
  if (toAdd.length > 0) {
    const { error } = await adminClient
      .from("user_commitments")
      .insert(
        toAdd.map((commitmentId) => ({
          user_id: input.userId,
          commitment_id: commitmentId,
        }))
      );

    if (error) {
      return { success: false, error: error.message };
    }
  }

  return { success: true };
}
