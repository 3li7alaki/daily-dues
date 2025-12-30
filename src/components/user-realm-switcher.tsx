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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
        <Avatar className="h-5 w-5">
          {currentRealm?.avatar_url && (
            <AvatarImage src={currentRealm.avatar_url} alt={currentRealm.name} />
          )}
          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
            {currentRealm?.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium">{currentRealm?.name}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 h-8">
          <Avatar className="h-5 w-5">
            {currentRealm?.avatar_url && (
              <AvatarImage src={currentRealm.avatar_url} alt={currentRealm?.name} />
            )}
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
              {currentRealm?.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
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
            <Avatar className="h-5 w-5">
              {realm.avatar_url && (
                <AvatarImage src={realm.avatar_url} alt={realm.name} />
              )}
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                {realm.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
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
