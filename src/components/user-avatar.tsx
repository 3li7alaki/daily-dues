"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
}

export function UserAvatar({
  name,
  avatarUrl,
  className,
  fallbackClassName,
}: UserAvatarProps) {
  return (
    <Avatar className={cn("h-9 w-9", className)}>
      {avatarUrl && (
        <AvatarImage
          src={avatarUrl}
          alt={name}
          className="object-cover"
        />
      )}
      <AvatarFallback className={fallbackClassName}>
        {name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
