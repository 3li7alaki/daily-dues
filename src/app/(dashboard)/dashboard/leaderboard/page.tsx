"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useLeaderboard, useCommitments } from "@/lib/queries";
import { LeaderboardTable } from "@/components/leaderboard-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRealm } from "@/contexts/realm-context";

export default function LeaderboardPage() {
  const [selectedCommitmentId, setSelectedCommitmentId] = useState<string>("");
  const { currentRealm } = useRealm();

  const { data: commitments = [], isLoading: loadingCommitments } = useCommitments();
  const { data: entries = [], isLoading: loadingLeaderboard } = useLeaderboard(
    selectedCommitmentId || undefined
  );

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

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <LeaderboardTable entries={entries} commitment={selectedCommitment} />
      )}
    </div>
  );
}
