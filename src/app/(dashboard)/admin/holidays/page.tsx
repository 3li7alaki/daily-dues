import { requireAdmin } from "@/lib/supabase/proxy";
import { HolidaysManager } from "@/components/admin/holidays-manager";

export default async function AdminHolidaysPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Holidays</h1>
        <p className="text-muted-foreground">
          Manage realm-wide and user-specific holidays. Holidays are completely ignored -
          they don't break streaks or count as missed commitments.
        </p>
      </div>

      <HolidaysManager />
    </div>
  );
}
