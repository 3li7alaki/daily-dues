"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home,
  Trophy,
  Users,
  ClipboardCheck,
  Settings,
  LogOut,
  Menu,
  Building2,
  BicepsFlexed,
  Calendar,
  Swords,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Profile } from "@/types/database";

interface NavHeaderProps {
  profile: Profile;
}

// Nav items for regular users
const userNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/dashboard/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/dashboard/challenges", label: "Challenges", icon: Swords },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

// Nav items for admins (no stats pages, just management)
const adminNavItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/dashboard/challenges", label: "Challenges", icon: Swords },
  { href: "/admin/realms", label: "Realms", icon: Building2 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/commitments", label: "Commitments", icon: BicepsFlexed },
  { href: "/admin/challenges", label: "Manage Challenges", icon: Swords },
  { href: "/admin/holidays", label: "Holidays", icon: Calendar },
  { href: "/admin/approvals", label: "Approvals", icon: ClipboardCheck },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function NavHeader({ profile }: NavHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const isAdmin = profile.role === "admin";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    router.push("/login");
    router.refresh();
  };

  const allNavItems = isAdmin ? adminNavItems : userNavItems;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        {/* Logo - always visible */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <BicepsFlexed className="h-6 w-6" />
            <span className="font-bold">Daily Dues</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium ml-6">
            {allNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative transition-colors hover:text-foreground/80 ${
                    isActive ? "text-foreground" : "text-foreground/60"
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-primary"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <AnimatedThemeToggler className="p-2 rounded-full hover:bg-muted transition-colors" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <UserAvatar
                  name={profile.name}
                  avatarUrl={profile.avatar_url}
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{profile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {profile.email}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-500 font-bold">
                <LogOut className="mr-1 h-5 w-5 text-red-500" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-4">
              <SheetHeader>
                <SheetTitle className="flex items-center space-x-2 mb-4">
                  <BicepsFlexed className="h-6 w-6" />
                  <span className="font-bold">Daily Dues</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col space-y-2">
                {allNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
