import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/proxy";
import { UsersManager } from "@/components/admin/users-manager";

export default async function AdminUsersPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: users }, { data: invites }, { data: commitments }, { data: userRealms }] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "user").order("created_at", { ascending: false }),
    supabase.from("invites").select("*").order("created_at", { ascending: false }),
    supabase.from("commitments").select("*").eq("is_active", true),
    supabase.from("user_realms").select("*"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Users</h1>
        <p className="text-muted-foreground">
          Invite new users and manage existing ones.
        </p>
      </div>

      <UsersManager
        users={users || []}
        invites={invites || []}
        commitments={commitments || []}
        userRealms={userRealms || []}
      />
    </div>
  );
}
