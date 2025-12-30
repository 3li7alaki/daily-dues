"use client";

import { ChevronDown } from "lucide-react";
import { useRealm } from "@/contexts/realm-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RealmAvatar } from "@/components/realm-avatar";
import { Skeleton } from "@/components/ui/skeleton";

export function UserRealmSwitcher() {
  const { realms, currentRealm, setCurrentRealm, loading } = useRealm();

  if (loading) {
    return <Skeleton className="h-8 w-32" />;
  }

  if (realms.length === 0) {
    return null;
  }

  if (realms.length === 1) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <RealmAvatar
          name={currentRealm?.name || "R"}
          avatarUrl={currentRealm?.avatar_url}
          className="h-5 w-5"
          fallbackClassName="text-[10px]"
        />
        <span className="font-medium">{currentRealm?.name}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 h-8">
          <RealmAvatar
            name={currentRealm?.name || "R"}
            avatarUrl={currentRealm?.avatar_url}
            className="h-5 w-5"
            fallbackClassName="text-[10px]"
          />
          <span className="max-w-[100px] truncate">{currentRealm?.name}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {realms.map((realm) => (
          <DropdownMenuItem
            key={realm.id}
            onClick={() => setCurrentRealm(realm)}
            className="flex items-center gap-2"
          >
            <RealmAvatar
              name={realm.name}
              avatarUrl={realm.avatar_url}
              className="h-5 w-5"
              fallbackClassName="text-[10px]"
            />
            <span>{realm.name}</span>
            {realm.id === currentRealm?.id && (
              <span className="ml-auto text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
