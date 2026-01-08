"use client";

import { useState } from "react";
import { Loader2, Flame, Target } from "lucide-react";
import { useLeaderboard, useCommitments, useCurrentUser } from "@/lib/queries";
import { LeaderboardTable } from "@/components/leaderboard-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useRealm } from "@/contexts/realm-context";

export default function LeaderboardPage() {
  const [selectedCommitmentId, setSelectedCommitmentId] = useState<string>("");
  const [sortBy, setSortBy] = useState<"streak" | "reps">("streak");
  const { currentRealm } = useRealm();
  const { data: currentUser } = useCurrentUser();

  const { data: commitments = [], isLoading: loadingCommitments } = useCommitments();
  const { data: entries = [], isLoading: loadingLeaderboard } = useLeaderboard(
    selectedCommitmentId || undefined,
    sortBy
  );

  const isAdmin = currentUser?.role === "admin";

  // Filter commitments by current realm
  const realmCommitments = currentRealm
    ? commitments.filter((c) => c.realm_id === currentRealm.id && c.is_active)
    : commitments.filter((c) => c.is_active);

  // Auto-select first commitment if none selected
  if (!selectedCommitmentId && realmCommitments.length > 0) {
    setSelectedCommitmentId(realmCommitments[0].id);
  }

  const selectedCommitment = commitments.find((c) => c.id === selectedCommitmentId);

  const isLoading = loadingCommitments || loadingLeaderboard;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
          <p className="text-muted-foreground">
            See how you stack up against others.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Sort Toggle */}
          <ToggleGroup
            type="single"
            value={sortBy}
            onValueChange={(value) => value && setSortBy(value as "streak" | "reps")}
            className="justify-start"
          >
            <ToggleGroupItem value="streak" aria-label="Sort by streak" className="gap-1.5">
              <Flame className="h-4 w-4" />
              Streak
            </ToggleGroupItem>
            <ToggleGroupItem value="reps" aria-label="Sort by total completed" className="gap-1.5">
              <Target className="h-4 w-4" />
              Total
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Commitment Selector */}
          {realmCommitments.length > 0 && (
            <Select
              value={selectedCommitmentId}
              onValueChange={setSelectedCommitmentId}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select commitment" />
              </SelectTrigger>
              <SelectContent>
                {realmCommitments.map((commitment) => (
                  <SelectItem key={commitment.id} value={commitment.id}>
                    {commitment.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <LeaderboardTable entries={entries} commitment={selectedCommitment} isAdmin={isAdmin} sortBy={sortBy} />
      )}
    </div>
  );
}
