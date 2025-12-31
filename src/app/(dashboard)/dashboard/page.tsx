import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/proxy";
import { redirect } from "next/navigation";
import { formatDateForDb } from "@/lib/carry-over";
import { DashboardContent } from "@/components/dashboard-content";
import type { Commitment, Realm, DailyLog } from "@/types/database";

interface UserCommitmentWithDetails {
  id: string;
  user_id: string;
  commitment_id: string;
  pending_carry_over: number;
  total_completed: number;
  current_streak: number;
  best_streak: number;
  assigned_at: string;
  commitment: Commitment;
}

interface UserRealmWithDetails {
  id: string;
  user_id: string;
  realm_id: string;
  joined_at: string;
  realm: Realm;
}

export default async function DashboardPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const today = new Date();
  const todayStr = formatDateForDb(today);

  // Get user's realms
  const { data: userRealms } = await supabase
    .from("user_realms")
    .select("*, realm:realms(*)")
    .eq("user_id", profile.id);

  const typedUserRealms = (userRealms || []) as unknown as UserRealmWithDetails[];
  const realms = typedUserRealms.map((ur) => ur.realm).filter((r): r is Realm => r !== null);

  // Get user's assigned commitments with pending carry-over (across all realms)
  const { data: userCommitments } = await supabase
    .from("user_commitments")
    .select(`
      *,
      commitment:commitments(*)
    `)
    .eq("user_id", profile.id);

  // Get today's logs
  const { data: todayLogs } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", profile.id)
    .eq("date", todayStr);

  // Get realm stats for all user's realms
  const realmStats: Record<string, { totalUsers: number; completedUsers: number }> = {};

  for (const realm of realms) {
    // Get commitments in this realm
    const { data: realmCommitments } = await supabase
      .from("commitments")
      .select("id")
      .eq("realm_id", realm.id);

    const commitmentIds = realmCommitments?.map((c) => c.id) || [];

    if (commitmentIds.length === 0) {
      // No commitments in realm
      realmStats[realm.id] = { totalUsers: 0, completedUsers: 0 };
      continue;
    }

    // Get all users in this realm
    const { data: realmUsers } = await supabase
      .from("user_realms")
      .select("user_id")
      .eq("realm_id", realm.id);

    const uniqueUserIds = realmUsers?.map((ur) => ur.user_id) || [];

    if (uniqueUserIds.length === 0) {
      realmStats[realm.id] = { totalUsers: 0, completedUsers: 0 };
      continue;
    }

    // Get users who have at least one approved log today for this realm
    const { data: completedLogs } = await supabase
      .from("daily_logs")
      .select("user_id")
      .eq("date", todayStr)
      .eq("status", "approved")
      .in("commitment_id", commitmentIds)
      .in("user_id", uniqueUserIds);

    const uniqueCompletedUsers = new Set(completedLogs?.map((l) => l.user_id) || []);

    realmStats[realm.id] = {
      totalUsers: uniqueUserIds.length,
      completedUsers: uniqueCompletedUsers.size,
    };
  }

  const typedUserCommitments = (userCommitments || []) as UserCommitmentWithDetails[];

  return (
    <DashboardContent
      profile={profile}
      realms={realms}
      userCommitments={typedUserCommitments}
      todayLogs={(todayLogs || []) as DailyLog[]}
      realmStats={realmStats}
      today={today.toISOString()}
    />
  );
}
