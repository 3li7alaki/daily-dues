import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getPendingApprovals, type LogWithRelations } from "@/app/actions/approvals";
import { logProgress, approveLog } from "@/app/actions/logs";
import {
  createCommitment as createCommitmentAction,
  updateCommitment as updateCommitmentAction,
  toggleCommitmentActive as toggleCommitmentActiveAction,
  deleteCommitment as deleteCommitmentAction,
} from "@/app/actions/commitments";
import { assignUserCommitments as assignUserCommitmentsAction } from "@/app/actions/assignments";
import {
  createHoliday as createHolidayAction,
  deleteHoliday as deleteHolidayAction,
} from "@/app/actions/holidays";
import {
  createRealm as createRealmAction,
  updateRealm as updateRealmAction,
  deleteRealm as deleteRealmAction,
} from "@/app/actions/realms";
import {
  createChallenge as createChallengeAction,
  joinChallenge as joinChallengeAction,
  submitVote as submitVoteAction,
  getChallenges as getChallengesAction,
  getChallengeLeaderboard as getChallengeLeaderboardAction,
  archiveChallenge as archiveChallengeAction,
  sendChallengeResults as sendChallengeResultsAction,
  type ChallengeWithDetails,
  type ChallengeLeaderboardData,
  type ChallengeLeaderboardEntry,
  type CreateChallengeInput,
  type SubmitVoteInput,
} from "@/app/actions/challenges";
import type {
  Profile,
  Realm,
  Invite,
  Commitment,
  UserCommitment,
  DailyLog,
  UserRealm,
  Holiday,
} from "@/types/database";

// Query Keys
export const queryKeys = {
  currentUser: ["currentUser"] as const,
  profile: (userId: string) => ["profile", userId] as const,
  realms: ["realms"] as const,
  realm: (realmId: string) => ["realm", realmId] as const,
  users: ["users"] as const,
  userRealms: ["userRealms"] as const,
  invites: ["invites"] as const,
  commitments: ["commitments"] as const,
  userCommitments: (userId: string) => ["userCommitments", userId] as const,
  dailyLogs: (userId: string, date: string) => ["dailyLogs", userId, date] as const,
  pendingApprovals: (realmId?: string) => ["pendingApprovals", realmId] as const,
  leaderboard: (commitmentId?: string, sortBy?: string) => ["leaderboard", commitmentId, sortBy] as const,
  holidays: (realmId?: string) => ["holidays", realmId] as const,
  challenges: (realmId?: string) => ["challenges", realmId] as const,
  challengeLeaderboard: (challengeId: string) => ["challengeLeaderboard", challengeId] as const,
  realmDebtBank: (realmId?: string) => ["realmDebtBank", realmId] as const,
};

// ============ Queries ============

// Realms
export function useRealms() {
  const supabase = createClient();
  return useQuery({
    queryKey: queryKeys.realms,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("realms")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Realm[];
    },
  });
}

// Current User Profile
export function useCurrentUser() {
  const supabase = createClient();
  return useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data as Profile;
    },
  });
}

// Users
export function useUsers() {
  const supabase = createClient();
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Profile[];
    },
  });
}

// User Realms
export function useUserRealms() {
  const supabase = createClient();
  return useQuery({
    queryKey: queryKeys.userRealms,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_realms")
        .select("*");
      if (error) throw error;
      return data as UserRealm[];
    },
  });
}

// Invites
export function useInvites() {
  const supabase = createClient();
  return useQuery({
    queryKey: queryKeys.invites,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invites")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Invite[];
    },
  });
}

// Commitments
export function useCommitments() {
  const supabase = createClient();
  return useQuery({
    queryKey: queryKeys.commitments,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commitments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Commitment[];
    },
  });
}

// User Commitments
export function useUserCommitments(userId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: queryKeys.userCommitments(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_commitments")
        .select("*, commitment:commitments(*)")
        .eq("user_id", userId);
      if (error) throw error;
      return data as (UserCommitment & { commitment: Commitment })[];
    },
    enabled: !!userId,
  });
}

// Daily Logs
export function useDailyLogs(userId: string, date: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: queryKeys.dailyLogs(userId, date),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("date", date);
      if (error) throw error;
      return data as DailyLog[];
    },
    enabled: !!userId && !!date,
  });
}

// Pending Approvals - uses server action to bypass RLS
export { type LogWithRelations } from "@/app/actions/approvals";

export function usePendingApprovals(realmId?: string) {
  return useQuery({
    queryKey: queryKeys.pendingApprovals(realmId),
    queryFn: () => getPendingApprovals(realmId),
  });
}

// Today's status for leaderboard entries
export type TodayStatus = "not_due" | "not_logged" | "pending" | "approved";

// Leaderboard Entry - user_commitments row with nested user and commitment
export interface LeaderboardEntry extends UserCommitment {
  user: Profile;
  commitment: Commitment;
  todayStatus: TodayStatus;
}

// Leaderboard - per commitment with sorting options
export function useLeaderboard(commitmentId?: string, sortBy: "streak" | "reps" = "streak") {
  const supabase = createClient();
  return useQuery({
    queryKey: queryKeys.leaderboard(commitmentId, sortBy),
    queryFn: async () => {
      // Get user_commitments with user and commitment info
      const { data, error } = await supabase
        .from("user_commitments")
        .select("*, user:profiles(*), commitment:commitments(*)");

      if (error) throw error;

      let entries = data as Omit<LeaderboardEntry, "todayStatus">[];

      // Filter by commitment if specified
      if (commitmentId) {
        entries = entries.filter((e) => e.commitment.id === commitmentId);
      }

      // Only include entries where user has role 'user' (not admin)
      entries = entries.filter((e) => e.user.role === "user");

      // Get today's info for status calculation
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const todayDayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday

      // Fetch all of today's logs (both pending and approved)
      const { data: todayLogs } = await supabase
        .from("daily_logs")
        .select("user_id, commitment_id, status, reviewed_at")
        .eq("date", todayStr);

      // Create maps for today's log status and completion time
      const logStatusMap = new Map<string, "pending" | "approved">();
      const completionTimeMap = new Map<string, string>();
      todayLogs?.forEach((log) => {
        const key = `${log.user_id}-${log.commitment_id}`;
        if (log.status === "approved") {
          logStatusMap.set(key, "approved");
          completionTimeMap.set(key, log.reviewed_at || "");
        } else if (log.status === "pending" && !logStatusMap.has(key)) {
          logStatusMap.set(key, "pending");
        }
      });

      // Compute todayStatus for each entry
      const entriesWithStatus: LeaderboardEntry[] = entries.map((entry) => {
        const key = `${entry.user_id}-${entry.commitment_id}`;
        const isCommitmentDay = entry.commitment.active_days.includes(todayDayOfWeek);

        let todayStatus: TodayStatus;
        if (!isCommitmentDay) {
          todayStatus = "not_due";
        } else {
          todayStatus = logStatusMap.get(key) || "not_logged";
        }

        return { ...entry, todayStatus };
      });

      // Sort based on sortBy parameter
      if (sortBy === "reps") {
        // Sort by total_completed descending
        entriesWithStatus.sort((a, b) => b.total_completed - a.total_completed);
      } else {
        // Default: sort by streak, then by earliest completion time
        entriesWithStatus.sort((a, b) => {
          // Primary sort: current_streak descending
          if (b.current_streak !== a.current_streak) {
            return b.current_streak - a.current_streak;
          }
          // Secondary sort: earliest completion time (who finished first today)
          const timeA = completionTimeMap.get(`${a.user_id}-${a.commitment_id}`) || "9999";
          const timeB = completionTimeMap.get(`${b.user_id}-${b.commitment_id}`) || "9999";
          return timeA.localeCompare(timeB);
        });
      }

      return entriesWithStatus;
    },
    enabled: true,
  });
}

// Holidays
export function useHolidays(realmId?: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: queryKeys.holidays(realmId),
    queryFn: async () => {
      let query = supabase
        .from("holidays")
        .select("*, user:profiles!holidays_user_id_fkey(id, name, username, avatar_url), realm:realms(id, name)")
        .order("date", { ascending: false });

      if (realmId) {
        query = query.eq("realm_id", realmId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (Holiday & {
        user: { id: string; name: string; username: string; avatar_url: string | null } | null;
        realm: { id: string; name: string };
      })[];
    },
  });
}

// Check if a specific date is a holiday for a user
export function useTodayIsHoliday(realmId?: string, userId?: string, date?: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: [...queryKeys.holidays(realmId), "check", date, userId],
    queryFn: async () => {
      if (!realmId || !userId || !date) return null;

      // Check for realm-wide holidays OR user-specific holidays
      const { data, error } = await supabase
        .from("holidays")
        .select("id, description, user_id")
        .eq("realm_id", realmId)
        .eq("date", date);

      if (error) throw error;

      // Filter to find a holiday that applies to this user (realm-wide OR user-specific)
      const applicableHoliday = data?.find(
        (h: { user_id: string | null }) => h.user_id === null || h.user_id === userId
      );

      return applicableHoliday || null;
    },
    enabled: !!realmId && !!userId && !!date,
  });
}

// Realm Debt Bank - total debt repaid across all users in a realm
export function useRealmDebtBank(realmId?: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: queryKeys.realmDebtBank(realmId),
    queryFn: async () => {
      if (!realmId) return { total: 0, unit: "" };

      // First get all commitments in this realm to get the unit
      const { data: commitments } = await supabase
        .from("commitments")
        .select("id, unit")
        .eq("realm_id", realmId)
        .limit(1);

      const unit = commitments?.[0]?.unit || "reps";
      const commitmentIds = commitments?.map(c => c.id) || [];

      if (commitmentIds.length === 0) {
        return { total: 0, unit };
      }

      // Get all user_commitments for commitments in this realm
      const { data, error } = await supabase
        .from("user_commitments")
        .select("debt_repaid")
        .in("commitment_id", commitmentIds);

      if (error) throw error;

      // Sum up all debt_repaid values
      const total = (data || []).reduce(
        (sum, uc) => sum + ((uc.debt_repaid as number) || 0),
        0
      );

      return { total, unit };
    },
    enabled: !!realmId,
  });
}

// ============ Mutations ============

// Create/Update Daily Log
export function useLogProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      existingLogId,
      commitmentId,
      date,
      completedAmount,
    }: {
      existingLogId?: string;
      userId: string;
      commitmentId: string;
      date: string;
      completedAmount: number;
    }) => {
      const result = await logProgress({
        existingLogId,
        commitmentId,
        date,
        completedAmount,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data as DailyLog;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.dailyLogs(variables.userId, variables.date),
      });
    },
  });
}

// Approve/Reject Log
export function useApproveLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      log,
      approved,
    }: {
      log: LogWithRelations;
      approved: boolean;
    }) => {
      const result = await approveLog({
        logId: log.id,
        approved,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      return { approved };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingApprovals"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}

// Create Commitment
export function useCreateCommitment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commitment: {
      name: string;
      description?: string;
      daily_target: number;
      unit: string;
      active_days: number[];
      punishment_multiplier: number;
      realm_id: string;
    }) => {
      const result = await createCommitmentAction(commitment);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data as Commitment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.commitments });
    },
  });
}

// Update Commitment
export function useUpdateCommitment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      description?: string;
      daily_target?: number;
      unit?: string;
      active_days?: number[];
      punishment_multiplier?: number;
    }) => {
      const result = await updateCommitmentAction({ id, ...updates });

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data as Commitment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.commitments });
    },
  });
}

// Toggle Commitment Active
export function useToggleCommitmentActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const result = await toggleCommitmentActiveAction({ id, is_active });

      if (!result.success) {
        throw new Error(result.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.commitments });
    },
  });
}

// Delete Commitment
export function useDeleteCommitment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteCommitmentAction(id);

      if (!result.success) {
        throw new Error(result.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.commitments });
    },
  });
}

// Create Realm
export function useCreateRealm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (realm: { name: string; slug: string; avatar_url?: string }) => {
      const result = await createRealmAction(realm);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data as Realm;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.realms });
    },
  });
}

// Update Realm
export function useUpdateRealm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      slug?: string;
      avatar_url?: string | null;
    }) => {
      const result = await updateRealmAction({ id, ...updates });

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data as Realm;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.realms });
    },
  });
}

// Delete Realm
export function useDeleteRealm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteRealmAction(id);

      if (!result.success) {
        throw new Error(result.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.realms });
      queryClient.invalidateQueries({ queryKey: queryKeys.userRealms });
    },
  });
}

// Delete Invite
export function useDeleteInvite() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invites });
    },
  });
}

// Assign User Commitments
export function useAssignUserCommitments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      commitmentIds,
    }: {
      userId: string;
      commitmentIds: string[];
    }) => {
      const result = await assignUserCommitmentsAction({ userId, commitmentIds });

      if (!result.success) {
        throw new Error(result.error);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.userCommitments(variables.userId),
      });
    },
  });
}

// Create Holiday
export function useCreateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (holiday: {
      realm_id: string;
      user_id?: string | null;
      date: string;
      description: string;
    }) => {
      const result = await createHolidayAction(holiday);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data as Holiday;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
    },
  });
}

// Delete Holiday
export function useDeleteHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteHolidayAction(id);

      if (!result.success) {
        throw new Error(result.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
    },
  });
}

// ============ Challenge Queries ============

// Get challenges for a realm
export function useChallenges(realmId?: string) {
  return useQuery({
    queryKey: queryKeys.challenges(realmId),
    queryFn: async () => {
      const result = await getChallengesAction(realmId);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
  });
}

// Get challenge leaderboard
export function useChallengeLeaderboard(challengeId: string) {
  return useQuery({
    queryKey: queryKeys.challengeLeaderboard(challengeId),
    queryFn: async () => {
      const result = await getChallengeLeaderboardAction(challengeId);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    enabled: !!challengeId,
    refetchInterval: 30000, // Refetch every 30 seconds for live updates
  });
}

// ============ Challenge Mutations ============

// Create challenge (admin)
export function useCreateChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateChallengeInput) => {
      const result = await createChallengeAction(input);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.challenges(variables.realm_id) });
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
    },
  });
}

// Join challenge
export function useJoinChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (challengeId: string) => {
      const result = await joinChallengeAction(challengeId);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.challengeLeaderboard(data.challenge_id),
      });
    },
  });
}

// Submit vote
export function useSubmitVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SubmitVoteInput) => {
      const result = await submitVoteAction(input);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.challengeLeaderboard(variables.challenge_id),
      });
    },
  });
}

// Archive challenge (admin)
export function useArchiveChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (challengeId: string) => {
      const result = await archiveChallengeAction(challengeId);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
    },
  });
}

export function useSendChallengeResults() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (challengeId: string) => {
      const result = await sendChallengeResultsAction(challengeId);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
    },
  });
}

// Re-export types for convenience
export type { ChallengeWithDetails, ChallengeLeaderboardData, ChallengeLeaderboardEntry };
