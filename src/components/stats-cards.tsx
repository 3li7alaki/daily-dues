"use client";

import { motion } from "framer-motion";
import { Flame, Target, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Profile } from "@/types/database";

interface StatsCardsProps {
  profile: Profile;
}

export function StatsCards({ profile }: StatsCardsProps) {
  const stats = [
    {
      label: "Current Streak",
      value: profile.current_streak,
      icon: Flame,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      label: "Best Streak",
      value: profile.best_streak,
      icon: Trophy,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      label: "Total Completed",
      value: profile.total_completed,
      icon: Target,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
