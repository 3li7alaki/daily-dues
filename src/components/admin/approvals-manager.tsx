"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Loader2, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { calculateCarryOver } from "@/lib/carry-over";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { DailyLog, Profile, Commitment } from "@/types/database";

interface LogWithRelations extends DailyLog {
  user: Profile;
  commitment: Commitment;
}

interface ApprovalsManagerProps {
  logs: LogWithRelations[];
}

export function ApprovalsManager({ logs }: ApprovalsManagerProps) {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const supabase = createClient();

  const handleApproval = async (log: LogWithRelations, approved: boolean) => {
    setLoading((prev) => ({ ...prev, [log.id]: true }));

    const { data: { user: admin } } = await supabase.auth.getUser();

    // Update log status
    const { error } = await supabase
      .from("daily_logs")
      .update({
        status: approved ? "approved" : "rejected",
        reviewed_by: admin!.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", log.id);

    if (error) {
      toast.error("Failed to update status");
      setLoading((prev) => ({ ...prev, [log.id]: false }));
      return;
    }

    if (approved) {
      // Calculate stats updates
      const totalDue = log.target_amount + log.carry_over_from_previous;
      const completed = log.completed_amount;
      const missed = Math.max(0, totalDue - completed);

      if (completed >= totalDue) {
        // Full completion - increment streak and clear carry-over
        await supabase
          .from("profiles")
          .update({
            total_completed: log.user.total_completed + completed,
            current_streak: log.user.current_streak + 1,
            best_streak: Math.max(log.user.best_streak, log.user.current_streak + 1),
          })
          .eq("id", log.user_id);

        // Clear carry-over
        await supabase
          .from("user_commitments")
          .update({ pending_carry_over: 0 })
          .eq("user_id", log.user_id)
          .eq("commitment_id", log.commitment_id);
      } else {
        // Partial completion - reset streak and store punishment
        await supabase
          .from("profiles")
          .update({
            total_completed: log.user.total_completed + completed,
            current_streak: 0,
          })
          .eq("id", log.user_id);

        // Store carry-over punishment for next day
        const carryOver = calculateCarryOver(
          missed,
          log.commitment.punishment_multiplier
        );
        await supabase
          .from("user_commitments")
          .update({ pending_carry_over: carryOver })
          .eq("user_id", log.user_id)
          .eq("commitment_id", log.commitment_id);
      }
    }

    toast.success(approved ? "Approved!" : "Rejected");
    window.location.reload();
  };

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
          <p className="text-muted-foreground">
            No pending approvals at the moment.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((log, index) => {
        const totalDue = log.target_amount + log.carry_over_from_previous;
        const progress = Math.min((log.completed_amount / totalDue) * 100, 100);
        const isComplete = log.completed_amount >= totalDue;

        return (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* User Info */}
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {log.user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{log.user.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {log.commitment.name} • {new Date(log.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>
                        {log.completed_amount} / {totalDue} {log.commitment.unit}
                      </span>
                      {isComplete ? (
                        <Badge className="bg-green-500/10 text-green-600">
                          Complete
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Partial</Badge>
                      )}
                    </div>
                    <Progress value={progress} className="h-2" />
                    {log.carry_over_from_previous > 0 && (
                      <p className="text-xs text-orange-500">
                        Includes +{log.carry_over_from_previous} carry-over
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleApproval(log, false)}
                      disabled={loading[log.id]}
                    >
                      {loading[log.id] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApproval(log, true)}
                      disabled={loading[log.id]}
                    >
                      {loading[log.id] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
