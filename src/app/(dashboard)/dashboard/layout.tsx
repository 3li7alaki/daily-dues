import { RealmProvider } from "@/contexts/realm-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RealmProvider>{children}</RealmProvider>;
}
