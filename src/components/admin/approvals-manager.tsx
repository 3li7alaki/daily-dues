"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Loader2, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

import { usePendingApprovals, useApproveLog } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { DailyLog, Profile, Commitment } from "@/types/database";

interface LogWithRelations extends DailyLog {
  user: Profile;
  commitment: Commitment;
}

export function ApprovalsManager() {
  // React Query
  const { data: logs = [], isLoading: loadingLogs } = usePendingApprovals();
  const approveLogMutation = useApproveLog();

  const handleApproval = async (log: LogWithRelations, approved: boolean) => {
    try {
      await approveLogMutation.mutateAsync({ log, approved });
      toast.success(approved ? "Approved!" : "Rejected");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const isLoading = (logId: string, action: "approve" | "reject") => {
    return (
      approveLogMutation.isPending &&
      approveLogMutation.variables?.log.id === logId &&
      (action === "approve"
        ? approveLogMutation.variables?.approved
        : !approveLogMutation.variables?.approved)
    );
  };

  const isAnyLoading = (logId: string) => {
    return (
      approveLogMutation.isPending &&
      approveLogMutation.variables?.log.id === logId
    );
  };

  if (loadingLogs) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
      <AnimatePresence mode="popLayout">
        {logs.map((log, index) => {
          const totalDue = log.target_amount + log.carry_over_from_previous;
          const progress = Math.min((log.completed_amount / totalDue) * 100, 100);
          const isComplete = log.completed_amount >= totalDue;

          return (
            <motion.div
              key={log.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* User Info */}
                    <div className="flex items-center gap-3 flex-1">
                      <UserAvatar
                        name={log.user.name}
                        avatarUrl={log.user.avatar_url}
                        className="h-10 w-10"
                      />
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
                        disabled={isAnyLoading(log.id)}
                      >
                        {isLoading(log.id, "reject") ? (
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
                        disabled={isAnyLoading(log.id)}
                      >
                        {isLoading(log.id, "approve") ? (
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
      </AnimatePresence>
    </div>
  );
}
