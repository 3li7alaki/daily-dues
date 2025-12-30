"use client";

import { Building2, ChevronDown } from "lucide-react";
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

export function RealmSelector() {
  const { realms, currentRealm, setCurrentRealm, loading } = useRealm();

  if (loading) {
    return <Skeleton className="h-9 w-40" />;
  }

  if (realms.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Building2 className="h-4 w-4" />
        No realms
      </div>
    );
  }

  if (realms.length === 1) {
    return (
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6">
          {currentRealm?.avatar_url && (
            <AvatarImage src={currentRealm.avatar_url} alt={currentRealm.name} />
          )}
          <AvatarFallback className="text-xs">
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
        <Button variant="outline" className="gap-2">
          <Avatar className="h-5 w-5">
            {currentRealm?.avatar_url && (
              <AvatarImage src={currentRealm.avatar_url} alt={currentRealm?.name} />
            )}
            <AvatarFallback className="text-xs">
              {currentRealm?.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span>{currentRealm?.name}</span>
          <ChevronDown className="h-4 w-4" />
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
              <AvatarFallback className="text-xs">
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
