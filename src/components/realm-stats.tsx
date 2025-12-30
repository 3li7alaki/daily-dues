import { Users, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import type { Realm } from "@/types/database";

interface RealmStatsProps {
  realm: Realm;
  completedUsers: number;
  totalUsers: number;
}

export function RealmStats({ realm, completedUsers, totalUsers }: RealmStatsProps) {
  const percentage = totalUsers > 0 ? Math.round((completedUsers / totalUsers) * 100) : 0;

  return (
    <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 border-2 border-primary/20">
            {realm.avatar_url ? (
              <AvatarImage src={realm.avatar_url} alt={realm.name} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
              {realm.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{realm.name}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Today&apos;s Progress</span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-2xl font-bold text-primary">
              <CheckCircle className="h-6 w-6" />
              {completedUsers}/{totalUsers}
            </div>
            <p className="text-xs text-muted-foreground">completed today</p>
          </div>
        </div>
        <div className="mt-4">
          <Progress value={percentage} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {percentage}% of team done
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
