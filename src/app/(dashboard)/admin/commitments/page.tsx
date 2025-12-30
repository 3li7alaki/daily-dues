import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/proxy";
import { CommitmentsManager } from "@/components/admin/commitments-manager";

export default async function AdminCommitmentsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: commitments } = await supabase
    .from("commitments")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Commitments</h1>
        <p className="text-muted-foreground">
          Create and configure daily commitments for users.
        </p>
      </div>

      <CommitmentsManager commitments={commitments || []} />
    </div>
  );
}
