import { requireAdmin } from "@/lib/supabase/proxy";
import { ChallengesManager } from "@/components/admin/challenges-manager";

export default async function AdminChallengesPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Challenges</h1>
        <p className="text-muted-foreground">
          Create time-limited competitions with peer-verified scoring.
        </p>
      </div>

      <ChallengesManager />
    </div>
  );
}
