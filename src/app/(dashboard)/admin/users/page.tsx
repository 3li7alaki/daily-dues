import { requireAdmin } from "@/lib/supabase/proxy";
import { UsersManager } from "@/components/admin/users-manager";

export default async function AdminUsersPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Users</h1>
        <p className="text-muted-foreground">
          Invite new users and manage existing ones.
        </p>
      </div>

      <UsersManager />
    </div>
  );
}
