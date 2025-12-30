import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/proxy";
import { ApprovalsManager } from "@/components/admin/approvals-manager";

export default async function AdminApprovalsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("daily_logs")
    .select(`
      *,
      user:profiles!daily_logs_user_id_fkey(*),
      commitment:commitments(*)
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pending Approvals</h1>
        <p className="text-muted-foreground">
          Review and approve user submissions.
        </p>
      </div>

      <ApprovalsManager logs={logs || []} />
    </div>
  );
}
