"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Clock, Loader2, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { formatDateForDb, isWorkDay } from "@/lib/carry-over";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Profile, Commitment, DailyLog } from "@/types/database";

interface UserCommitmentWithDetails {
  id: string;
  user_id: string;
  commitment_id: string;
  pending_carry_over: number;
  assigned_at: string;
  commitment: Commitment;
}

interface DailyCommitmentsProps {
  profile: Profile;
  userCommitments: UserCommitmentWithDetails[];
  todayLogs: DailyLog[];
  today: Date;
}

export function DailyCommitments({
  profile,
  userCommitments,
  todayLogs,
  today,
}: DailyCommitmentsProps) {
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const supabase = createClient();
  const todayStr = formatDateForDb(today);

  const getLogForCommitment = (commitmentId: string) =>
    todayLogs.find((log) => log.commitment_id === commitmentId);

  // Filter to only show commitments active today
  const activeToday = userCommitments.filter((uc) =>
    isWorkDay(today, uc.commitment.active_days)
  );

  const handleSubmit = async (uc: UserCommitmentWithDetails) => {
    const amount = amounts[uc.commitment.id] || 0;
    if (amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setLoading((prev) => ({ ...prev, [uc.commitment.id]: true }));

    const existingLog = getLogForCommitment(uc.commitment.id);
    const carryOver = uc.pending_carry_over || 0;

    if (existingLog) {
      // Update existing log
      const { error } = await supabase
        .from("daily_logs")
        .update({
          completed_amount: amount,
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingLog.id);

      if (error) {
        toast.error("Failed to update log");
      } else {
        toast.success("Progress updated! Awaiting approval.");
      }
    } else {
      // Create new log with carry-over from user_commitment
      const { error } = await supabase.from("daily_logs").insert({
        user_id: profile.id,
        commitment_id: uc.commitment.id,
        date: todayStr,
        target_amount: uc.commitment.daily_target,
        completed_amount: amount,
        carry_over_from_previous: carryOver,
        status: "pending",
      });

      if (error) {
        toast.error("Failed to log progress");
      } else {
        toast.success("Progress logged! Awaiting approval.");
      }
    }

    setLoading((prev) => ({ ...prev, [uc.commitment.id]: false }));
    setAmounts((prev) => ({ ...prev, [uc.commitment.id]: 0 }));

    // Refresh the page to show updated data
    window.location.reload();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
            <Check className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <X className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  if (activeToday.length === 0) {
    const hasCommitments = userCommitments.length > 0;
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {hasCommitments ? "Rest Day" : "No Commitments"}
          </h3>
          <p className="text-muted-foreground max-w-sm">
            {hasCommitments
              ? "Today is not a work day for your commitments. Take some time to rest and recover."
              : "You don't have any commitments assigned yet. Contact an admin to get started."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Today&apos;s Commitments</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {activeToday.map((uc, index) => {
          const log = getLogForCommitment(uc.commitment.id);
          const carryOver = log?.carry_over_from_previous || uc.pending_carry_over || 0;
          const totalDue = uc.commitment.daily_target + carryOver;
          const completed = log?.completed_amount || 0;
          const progress = Math.min((completed / totalDue) * 100, 100);

          return (
            <motion.div
              key={uc.commitment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{uc.commitment.name}</CardTitle>
                    {log && getStatusBadge(log.status)}
                  </div>
                  {uc.commitment.description && (
                    <p className="text-sm text-muted-foreground">
                      {uc.commitment.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>
                        {completed} / {totalDue} {uc.commitment.unit}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    {carryOver > 0 && (
                      <p className="text-xs text-orange-500">
                        +{carryOver} carry-over from previous day
                      </p>
                    )}
                  </div>

                  {log?.status !== "approved" && (
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder={`${uc.commitment.unit} done`}
                        min={0}
                        value={amounts[uc.commitment.id] || ""}
                        onChange={(e) =>
                          setAmounts((prev) => ({
                            ...prev,
                            [uc.commitment.id]: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="flex-1"
                      />
                      <Button
                        onClick={() => handleSubmit(uc)}
                        disabled={loading[uc.commitment.id]}
                      >
                        {loading[uc.commitment.id] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Log"
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
