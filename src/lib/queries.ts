import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { calculateCarryOver } from "@/lib/carry-over";
import { getPendingApprovals, type LogWithRelations } from "@/app/actions/approvals";
import type {
  Profile,
  Realm,
  Invite,
  Commitment,
  UserCommitment,
  DailyLog,
  UserRealm,
} from "@/types/database";

// Query Keys
export const queryKeys = {
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
  leaderboard: (realmId?: string) => ["leaderboard", realmId] as const,
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

// Leaderboard Entry - user_commitments row with nested user and commitment
export interface LeaderboardEntry extends UserCommitment {
  user: Profile;
  commitment: Commitment;
}

// Leaderboard - per commitment
export function useLeaderboard(commitmentId?: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: queryKeys.leaderboard(commitmentId),
    queryFn: async () => {
      // Get user_commitments with user and commitment info
      const { data, error } = await supabase
        .from("user_commitments")
        .select("*, user:profiles(*), commitment:commitments(*)")
        .order("current_streak", { ascending: false });

      if (error) throw error;

      let entries = data as LeaderboardEntry[];

      // Filter by commitment if specified
      if (commitmentId) {
        entries = entries.filter((e) => e.commitment.id === commitmentId);
      }

      // Only include entries where user has role 'user' (not admin)
      entries = entries.filter((e) => e.user.role === "user");

      return entries;
    },
    enabled: true,
  });
}

// ============ Mutations ============

// Create/Update Daily Log
export function useLogProgress() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      existingLogId,
      userId,
      commitmentId,
      date,
      targetAmount,
      completedAmount,
      carryOver,
    }: {
      existingLogId?: string;
      userId: string;
      commitmentId: string;
      date: string;
      targetAmount: number;
      completedAmount: number;
      carryOver: number;
    }) => {
      if (existingLogId) {
        const { data, error } = await supabase
          .from("daily_logs")
          .update({
            completed_amount: completedAmount,
            status: "pending",
            reviewed_by: null,
            reviewed_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingLogId)
          .select()
          .single();
        if (error) throw error;
        return data as DailyLog;
      } else {
        const { data, error } = await supabase
          .from("daily_logs")
          .insert({
            user_id: userId,
            commitment_id: commitmentId,
            date,
            target_amount: targetAmount,
            completed_amount: completedAmount,
            carry_over_from_previous: carryOver,
            status: "pending",
          })
          .select()
          .single();
        if (error) throw error;
        return data as DailyLog;
      }
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
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      log,
      approved,
    }: {
      log: LogWithRelations;
      approved: boolean;
    }) => {
      // Guard: only process pending logs to prevent double-counting
      if (log.status !== "pending") {
        throw new Error("Log has already been processed");
      }

      const { data: { user: admin } } = await supabase.auth.getUser();

      // Update log status
      const { error } = await supabase
        .from("daily_logs")
        .update({
          status: approved ? "approved" : "rejected",
          reviewed_by: admin!.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", log.id)
        .eq("status", "pending"); // Extra safety: only update if still pending

      if (error) throw error;

      if (approved) {
        // Get current user_commitment stats
        const { data: userCommitment } = await supabase
          .from("user_commitments")
          .select("*")
          .eq("user_id", log.user_id)
          .eq("commitment_id", log.commitment_id)
          .single();

        if (!userCommitment) throw new Error("User commitment not found");

        const totalDue = log.target_amount + log.carry_over_from_previous;
        const completed = log.completed_amount;
        const missed = Math.max(0, totalDue - completed);

        if (completed >= totalDue) {
          // Full completion - increment streak and add reps to total
          const newStreak = userCommitment.current_streak + 1;
          await supabase
            .from("user_commitments")
            .update({
              total_completed: userCommitment.total_completed + completed,
              current_streak: newStreak,
              best_streak: Math.max(userCommitment.best_streak, newStreak),
              pending_carry_over: 0,
            })
            .eq("user_id", log.user_id)
            .eq("commitment_id", log.commitment_id);
        } else {
          // Partial completion - reset streak, add reps to total, add carry over
          const carryOver = calculateCarryOver(
            missed,
            log.commitment.punishment_multiplier
          );
          await supabase
            .from("user_commitments")
            .update({
              total_completed: userCommitment.total_completed + completed,
              current_streak: 0,
              pending_carry_over: carryOver,
            })
            .eq("user_id", log.user_id)
            .eq("commitment_id", log.commitment_id);
        }
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
  const supabase = createClient();

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
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("commitments")
        .insert({ ...commitment, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as Commitment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.commitments });
    },
  });
}

// Update Commitment
export function useUpdateCommitment() {
  const queryClient = useQueryClient();
  const supabase = createClient();

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
      const { data, error } = await supabase
        .from("commitments")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Commitment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.commitments });
    },
  });
}

// Toggle Commitment Active
export function useToggleCommitmentActive() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("commitments")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.commitments });
    },
  });
}

// Delete Commitment
export function useDeleteCommitment() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("commitments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.commitments });
    },
  });
}

// Create Realm
export function useCreateRealm() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (realm: { name: string; slug: string; avatar_url?: string }) => {
      const { data, error } = await supabase
        .from("realms")
        .insert({ ...realm, avatar_url: realm.avatar_url || null })
        .select()
        .single();
      if (error) throw error;
      return data as Realm;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.realms });
    },
  });
}

// Update Realm
export function useUpdateRealm() {
  const queryClient = useQueryClient();
  const supabase = createClient();

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
      const { data, error } = await supabase
        .from("realms")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Realm;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.realms });
    },
  });
}

// Delete Realm
export function useDeleteRealm() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("realms").delete().eq("id", id);
      if (error) throw error;
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
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      userId,
      commitmentIds,
    }: {
      userId: string;
      commitmentIds: string[];
    }) => {
      // Get current assignments
      const { data: current } = await supabase
        .from("user_commitments")
        .select("commitment_id")
        .eq("user_id", userId);

      const currentIds = new Set(current?.map((c) => c.commitment_id) || []);
      const newIds = new Set(commitmentIds);

      // Find what to remove and what to add
      const toRemove = [...currentIds].filter((id) => !newIds.has(id));
      const toAdd = commitmentIds.filter((id) => !currentIds.has(id));

      // Remove unselected commitments
      if (toRemove.length > 0) {
        const { error } = await supabase
          .from("user_commitments")
          .delete()
          .eq("user_id", userId)
          .in("commitment_id", toRemove);
        if (error) throw error;
      }

      // Add new commitments
      if (toAdd.length > 0) {
        const { error } = await supabase.from("user_commitments").insert(
          toAdd.map((commitmentId) => ({
            user_id: userId,
            commitment_id: commitmentId,
          }))
        );
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.userCommitments(variables.userId),
      });
    },
  });
}
