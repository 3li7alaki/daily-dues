"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Challenge, ChallengeMember, Profile } from "@/types/database";

// Helper function to verify admin
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
    return { error: "Only admins can manage challenges", user: null };
  }

  return { error: null, user };
}

// ============ CREATE CHALLENGE ============

export interface CreateChallengeInput {
  realm_id: string;
  commitment_id: string;
  name: string;
  description?: string;
  duration_hours: number;
  max_units: number;
}

export interface ChallengeResult {
  success: boolean;
  error?: string;
  data?: Challenge;
}

export async function createChallenge(input: CreateChallengeInput): Promise<ChallengeResult> {
  const supabase = await createClient();
  const { error: authError, user } = await verifyAdmin(supabase);

  if (authError || !user) {
    return { success: false, error: authError || "Not authenticated" };
  }

  // Validate inputs
  if (!input.name || input.name.trim().length === 0) {
    return { success: false, error: "Name is required" };
  }

  if (input.duration_hours <= 0) {
    return { success: false, error: "Duration must be positive" };
  }

  if (input.max_units <= 0) {
    return { success: false, error: "Max units must be positive" };
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

  // Verify commitment exists and belongs to the realm
  const { data: commitment } = await adminClient
    .from("commitments")
    .select("id, realm_id")
    .eq("id", input.commitment_id)
    .single();

  if (!commitment) {
    return { success: false, error: "Commitment not found" };
  }

  if (commitment.realm_id !== input.realm_id) {
    return { success: false, error: "Commitment does not belong to this realm" };
  }

  const { data, error } = await adminClient
    .from("challenges")
    .insert({
      realm_id: input.realm_id,
      commitment_id: input.commitment_id,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      duration_hours: input.duration_hours,
      max_units: input.max_units,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as Challenge };
}

// ============ JOIN CHALLENGE ============

export interface JoinChallengeResult {
  success: boolean;
  error?: string;
  data?: ChallengeMember;
}

export async function joinChallenge(challengeId: string): Promise<JoinChallengeResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Verify challenge exists and is active
  const { data: challenge } = await supabase
    .from("challenges")
    .select("*")
    .eq("id", challengeId)
    .single();

  if (!challenge) {
    return { success: false, error: "Challenge not found" };
  }

  if (challenge.status !== "active") {
    return { success: false, error: "Challenge is not active" };
  }

  if (new Date() >= new Date(challenge.ends_at)) {
    return { success: false, error: "Challenge has ended" };
  }

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from("challenge_members")
    .select("id")
    .eq("challenge_id", challengeId)
    .eq("user_id", user.id)
    .single();

  if (existingMember) {
    return { success: false, error: "Already joined this challenge" };
  }

  // Join the challenge
  const { data, error } = await supabase
    .from("challenge_members")
    .insert({
      challenge_id: challengeId,
      user_id: user.id,
      votes: {},
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as ChallengeMember };
}

// ============ SUBMIT VOTE ============

export interface SubmitVoteInput {
  challenge_id: string;
  target_user_id: string;
  reps: number;
}

export interface SubmitVoteResult {
  success: boolean;
  error?: string;
}

export async function submitVote(input: SubmitVoteInput): Promise<SubmitVoteResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Cannot vote for yourself
  if (user.id === input.target_user_id) {
    return { success: false, error: "You cannot vote for yourself" };
  }

  // Verify challenge exists and is active
  const { data: challenge } = await supabase
    .from("challenges")
    .select("*")
    .eq("id", input.challenge_id)
    .single();

  if (!challenge) {
    return { success: false, error: "Challenge not found" };
  }

  if (challenge.status !== "active") {
    return { success: false, error: "Challenge is not active" };
  }

  if (new Date() >= new Date(challenge.ends_at)) {
    return { success: false, error: "Challenge has ended" };
  }

  // Validate reps
  if (input.reps < 0) {
    return { success: false, error: "Reps cannot be negative" };
  }

  if (input.reps > challenge.max_units) {
    return { success: false, error: `Reps cannot exceed max units (${challenge.max_units})` };
  }

  // Verify voter is a member of the challenge
  const { data: voterMember } = await supabase
    .from("challenge_members")
    .select("id")
    .eq("challenge_id", input.challenge_id)
    .eq("user_id", user.id)
    .single();

  if (!voterMember) {
    return { success: false, error: "You must join the challenge to vote" };
  }

  // Get target user's membership record
  const { data: targetMember, error: targetError } = await supabase
    .from("challenge_members")
    .select("*")
    .eq("challenge_id", input.challenge_id)
    .eq("user_id", input.target_user_id)
    .single();

  if (targetError || !targetMember) {
    return { success: false, error: "Target user is not in this challenge" };
  }

  // Check if vote can only increase
  const currentVotes = (targetMember.votes || {}) as Record<string, number>;
  const existingVote = currentVotes[user.id] || 0;

  if (input.reps < existingVote) {
    return {
      success: false,
      error: `Votes can only increase. Current vote: ${existingVote}`,
    };
  }

  // Update the votes
  const adminClient = createAdminClient();
  const newVotes = { ...currentVotes, [user.id]: input.reps };

  const { error: updateError } = await adminClient
    .from("challenge_members")
    .update({ votes: newVotes })
    .eq("id", targetMember.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

// ============ GET CHALLENGES ============

export interface ChallengeWithDetails extends Challenge {
  commitment: { name: string; unit: string };
  member_count: number;
  is_member: boolean;
}

export interface GetChallengesResult {
  success: boolean;
  error?: string;
  data?: ChallengeWithDetails[];
}

export async function getChallenges(realmId?: string): Promise<GetChallengesResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  let query = supabase
    .from("challenges")
    .select("*, commitment:commitments(name, unit), challenge_members(user_id)")
    .order("created_at", { ascending: false });

  if (realmId) {
    query = query.eq("realm_id", realmId);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  const challenges = (data || []).map((c) => ({
    ...c,
    commitment: c.commitment || { name: "Unknown", unit: "reps" },
    member_count: c.challenge_members?.length || 0,
    is_member: c.challenge_members?.some((m: { user_id: string }) => m.user_id === user.id) || false,
    challenge_members: undefined, // Remove the raw data
  })) as ChallengeWithDetails[];

  return { success: true, data: challenges };
}

// ============ GET CHALLENGE LEADERBOARD ============

export interface ChallengeLeaderboardEntry {
  user_id: string;
  user_name: string;
  user_avatar_url: string | null;
  votes: Record<string, number>;
  vote_count: number;
  agreed_reps: number | null;
  final_reps: number | null;
}

export interface ChallengeLeaderboardData {
  challenge: Challenge;
  commitment_name: string;
  commitment_unit: string;
  entries: ChallengeLeaderboardEntry[];
  is_valid: boolean;
  current_user_id: string;
}

export interface GetChallengeLeaderboardResult {
  success: boolean;
  error?: string;
  data?: ChallengeLeaderboardData;
}

export async function getChallengeLeaderboard(
  challengeId: string
): Promise<GetChallengeLeaderboardResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get challenge with commitment info
  const { data: challenge, error: challengeError } = await supabase
    .from("challenges")
    .select("*, commitment:commitments(name, unit)")
    .eq("id", challengeId)
    .single();

  if (challengeError || !challenge) {
    return { success: false, error: "Challenge not found" };
  }

  // Get all members with user info
  const { data: members, error: membersError } = await supabase
    .from("challenge_members")
    .select("*, user:profiles(id, name, avatar_url)")
    .eq("challenge_id", challengeId);

  if (membersError) {
    return { success: false, error: membersError.message };
  }

  // Process entries
  const entries: ChallengeLeaderboardEntry[] = (members || []).map((member) => {
    const votes = (member.votes || {}) as Record<string, number>;
    const voteValues = Object.values(votes);
    const voteCount = voteValues.length;

    // Calculate agreed reps (minimum) if at least 2 votes
    let agreedReps: number | null = null;
    if (voteCount >= 2) {
      agreedReps = Math.min(...voteValues);
    }

    const memberUser = member.user as Profile | null;

    return {
      user_id: member.user_id,
      user_name: memberUser?.name || "Unknown",
      user_avatar_url: memberUser?.avatar_url || null,
      votes,
      vote_count: voteCount,
      agreed_reps: agreedReps,
      final_reps: member.final_reps,
    };
  });

  // Sort by agreed_reps (or final_reps if archived), descending
  // Users without enough votes go to the bottom
  entries.sort((a, b) => {
    const aReps = challenge.status === "archived" ? a.final_reps : a.agreed_reps;
    const bReps = challenge.status === "archived" ? b.final_reps : b.agreed_reps;

    if (aReps === null && bReps === null) return 0;
    if (aReps === null) return 1;
    if (bReps === null) return -1;
    return bReps - aReps;
  });

  // Check if challenge is valid (enough participants with 2+ votes)
  const validEntries = entries.filter((e) => e.vote_count >= 2);
  const isValid = validEntries.length >= 2; // min_participants defaults to 2

  const commitmentData = challenge.commitment as { name: string; unit: string } | null;

  return {
    success: true,
    data: {
      challenge: challenge as Challenge,
      commitment_name: commitmentData?.name || "Unknown",
      commitment_unit: commitmentData?.unit || "reps",
      entries,
      is_valid: isValid,
      current_user_id: user.id,
    },
  };
}

// ============ ARCHIVE CHALLENGE ============

export interface ArchiveChallengeResult {
  success: boolean;
  error?: string;
}

export async function archiveChallenge(challengeId: string): Promise<ArchiveChallengeResult> {
  const supabase = await createClient();
  const { error: authError } = await verifyAdmin(supabase);

  if (authError) {
    return { success: false, error: authError };
  }

  const adminClient = createAdminClient();

  // Get challenge
  const { data: challenge } = await adminClient
    .from("challenges")
    .select("*")
    .eq("id", challengeId)
    .single();

  if (!challenge) {
    return { success: false, error: "Challenge not found" };
  }

  if (challenge.status === "archived") {
    return { success: false, error: "Challenge is already archived" };
  }

  // Archive the challenge
  const { error: updateError } = await adminClient
    .from("challenges")
    .update({ status: "archived" })
    .eq("id", challengeId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Calculate final reps for all members
  const { data: members } = await adminClient
    .from("challenge_members")
    .select("*")
    .eq("challenge_id", challengeId);

  for (const member of members || []) {
    const votes = (member.votes || {}) as Record<string, number>;
    const voteValues = Object.values(votes);

    let finalReps: number | null = null;
    if (voteValues.length >= 2) {
      finalReps = Math.min(...voteValues);
    }

    await adminClient
      .from("challenge_members")
      .update({ final_reps: finalReps })
      .eq("id", member.id);
  }

  return { success: true };
}
