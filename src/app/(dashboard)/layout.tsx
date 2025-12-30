import { requireAuth, getProfile } from "@/lib/supabase/proxy";
import { NavHeader } from "@/components/nav-header";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader profile={profile} />
      <main className="container py-6">{children}</main>
    </div>
  );
}
