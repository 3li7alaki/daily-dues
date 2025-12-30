import { requireAdmin } from "@/lib/supabase/proxy";
import { RealmsManager } from "@/components/admin/realms-manager";

export default async function AdminRealmsPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Realms</h1>
        <p className="text-muted-foreground">
          Create and manage realms (organizations/teams).
        </p>
      </div>

      <RealmsManager />
    </div>
  );
}
