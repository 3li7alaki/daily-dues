"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { DailyLog, Profile, Commitment } from "@/types/database";

export interface LogWithRelations extends DailyLog {
  user: Profile;
  commitment: Commitment;
}

export async function getPendingApprovals(
  realmId?: string
): Promise<LogWithRelations[]> {
  // Verify the caller is an admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    throw new Error("Only admins can view pending approvals");
  }

  // Use admin client to bypass RLS for fetching all pending logs
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("daily_logs")
    .select("*, user:profiles!daily_logs_user_id_fkey(*), commitment:commitments(*)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;

  let logs = data as LogWithRelations[];

  if (realmId) {
    logs = logs.filter((log) => log.commitment.realm_id === realmId);
  }

  return logs;
}
