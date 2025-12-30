import { requireAdmin } from "@/lib/supabase/proxy";
import { ApprovalsManager } from "@/components/admin/approvals-manager";

export default async function AdminApprovalsPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pending Approvals</h1>
        <p className="text-muted-foreground">
          Review and approve user submissions.
        </p>
      </div>

      <ApprovalsManager />
    </div>
  );
}
