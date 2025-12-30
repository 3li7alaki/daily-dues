import { createClient } from "@/lib/supabase/server";
import { LeaderboardTable } from "@/components/leaderboard-table";

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "user")
    .order("current_streak", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground">
          See how you stack up against others.
        </p>
      </div>

      <LeaderboardTable profiles={profiles || []} />
    </div>
  );
}
