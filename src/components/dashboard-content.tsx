"use client";

import { useMemo } from "react";
import { useRealm } from "@/contexts/realm-context";
import { isWorkDay } from "@/lib/carry-over";
import { QuoteCard } from "@/components/quote-card";
import { DailyCommitments } from "@/components/daily-commitments";
import { StatsCards } from "@/components/stats-cards";
import { RealmStats } from "@/components/realm-stats";
import { UserRealmSwitcher } from "@/components/user-realm-switcher";
import type { Profile, Commitment, Realm, DailyLog } from "@/types/database";

interface UserCommitmentWithDetails {
  id: string;
  user_id: string;
  commitment_id: string;
  pending_carry_over: number;
  total_completed: number;
  debt_repaid: number;
  current_streak: number;
  best_streak: number;
  assigned_at: string;
  commitment: Commitment;
}

interface DashboardContentProps {
  profile: Profile;
  realms: Realm[];
  userCommitments: UserCommitmentWithDetails[];
  todayLogs: DailyLog[];
  realmStats: Record<string, { totalUsers: number; completedUsers: number }>;
  today: string;
}

export function DashboardContent({
  profile,
  userCommitments,
  todayLogs,
  realmStats,
  today,
}: DashboardContentProps) {
  const { currentRealm, realms, loading } = useRealm();
  const todayDate = new Date(today);

  // Filter commitments by current realm
  const filteredCommitments = useMemo(() => {
    if (!currentRealm) return userCommitments;
    return userCommitments.filter(
      (uc) => uc.commitment.realm_id === currentRealm.id
    );
  }, [userCommitments, currentRealm]);

  // Filter logs by current realm (via commitment)
  const filteredLogs = useMemo(() => {
    if (!currentRealm) return todayLogs;
    const realmCommitmentIds = new Set(
      userCommitments
        .filter((uc) => uc.commitment.realm_id === currentRealm.id)
        .map((uc) => uc.commitment_id)
    );
    return todayLogs.filter((log) => realmCommitmentIds.has(log.commitment_id));
  }, [todayLogs, userCommitments, currentRealm]);

  // Check if today is a work day for filtered commitments
  const hasWorkToday = filteredCommitments.some((uc) =>
    isWorkDay(todayDate, uc.commitment.active_days)
  );

  const currentStats = currentRealm
    ? realmStats[currentRealm.id] || { totalUsers: 0, completedUsers: 0 }
    : { totalUsers: 0, completedUsers: 0 };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-24 bg-muted rounded" />
        <div className="h-32 bg-muted rounded" />
      </div>
    );
  }

  const isAdmin = profile.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {profile.name.split(" ")[0]}!
          </h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? "Manage your realms and users from the admin panel."
              : hasWorkToday
              ? "Here are your commitments for today."
              : filteredCommitments.length === 0
              ? "No commitments assigned in this realm."
              : "Today is a rest day. Enjoy!"}
          </p>
        </div>
        {realms.length > 1 && <UserRealmSwitcher />}
      </div>

      {currentRealm && !isAdmin && (
        <RealmStats
          realm={currentRealm}
          completedUsers={currentStats.completedUsers}
          totalUsers={currentStats.totalUsers}
        />
      )}

      <QuoteCard />

      {!isAdmin && (
        <>
          <StatsCards userCommitments={filteredCommitments} />

          <DailyCommitments
            profile={profile}
            userCommitments={filteredCommitments}
            todayLogs={filteredLogs}
            today={todayDate}
          />
        </>
      )}
    </div>
  );
}
