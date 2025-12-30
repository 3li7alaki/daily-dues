import { requireAdmin } from "@/lib/supabase/proxy";
import { CommitmentsManager } from "@/components/admin/commitments-manager";

export default async function AdminCommitmentsPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Commitments</h1>
        <p className="text-muted-foreground">
          Create and configure daily commitments for users.
        </p>
      </div>

      <CommitmentsManager />
    </div>
  );
}
