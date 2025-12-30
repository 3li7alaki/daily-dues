import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/proxy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Dumbbell, ClipboardCheck, Clock } from "lucide-react";

export default async function AdminPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [
    { count: usersCount },
    { count: commitmentsCount },
    { count: pendingCount },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "user"),
    supabase.from("commitments").select("*", { count: "exact", head: true }),
    supabase.from("daily_logs").select("*", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const stats = [
    {
      label: "Total Users",
      value: usersCount || 0,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Active Commitments",
      value: commitmentsCount || 0,
      icon: Dumbbell,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Pending Approvals",
      value: pendingCount || 0,
      icon: Clock,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage users, commitments, and approvals.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/admin/users"
              className="block p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <p className="font-medium">Manage Users</p>
              <p className="text-sm text-muted-foreground">
                Invite new users, manage existing ones
              </p>
            </a>
            <a
              href="/admin/commitments"
              className="block p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <p className="font-medium">Manage Commitments</p>
              <p className="text-sm text-muted-foreground">
                Create and configure daily commitments
              </p>
            </a>
            <a
              href="/admin/approvals"
              className="block p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <p className="font-medium">Review Approvals</p>
              <p className="text-sm text-muted-foreground">
                Approve or reject user submissions
              </p>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
