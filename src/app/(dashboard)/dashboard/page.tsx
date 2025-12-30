import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/proxy";
import { redirect } from "next/navigation";
import { formatDateForDb, isWorkDay } from "@/lib/carry-over";
import { QuoteCard } from "@/components/quote-card";
import { DailyCommitments } from "@/components/daily-commitments";
import { StatsCards } from "@/components/stats-cards";
import type { Commitment } from "@/types/database";

interface UserCommitmentWithDetails {
  id: string;
  user_id: string;
  commitment_id: string;
  pending_carry_over: number;
  assigned_at: string;
  commitment: Commitment;
}

export default async function DashboardPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const today = new Date();
  const todayStr = formatDateForDb(today);

  // Get user's assigned commitments with pending carry-over
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

  const typedUserCommitments = (userCommitments || []) as UserCommitmentWithDetails[];

  // Check if today is a work day based on each commitment's active days
  // Default to Bahrain work days if commitment doesn't specify
  const hasWorkToday = typedUserCommitments.some((uc) =>
    isWorkDay(today, uc.commitment.active_days)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {profile.name.split(" ")[0]}!
        </h1>
        <p className="text-muted-foreground">
          {hasWorkToday
            ? "Here are your commitments for today."
            : "Today is a rest day. Enjoy!"}
        </p>
      </div>

      <QuoteCard />

      <StatsCards profile={profile} />

      <DailyCommitments
        profile={profile}
        userCommitments={typedUserCommitments}
        todayLogs={todayLogs || []}
        today={today}
      />
    </div>
  );
}
