"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface RealmAvatarProps {
  name: string;
  avatarUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
}

export function RealmAvatar({
  name,
  avatarUrl,
  className,
  fallbackClassName,
}: RealmAvatarProps) {
  return (
    <Avatar className={cn("h-8 w-8", className)}>
      {avatarUrl && (
        <AvatarImage
          src={avatarUrl}
          alt={name}
          className="object-cover"
        />
      )}
      <AvatarFallback className={cn("bg-primary/10 text-primary font-semibold", fallbackClassName)}>
        {name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
