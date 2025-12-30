import { RealmProvider } from "@/contexts/realm-context";
import { RealmSelector } from "@/components/admin/realm-selector";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RealmProvider isAdmin>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <RealmSelector />
        </div>
        {children}
      </div>
    </RealmProvider>
  );
}
