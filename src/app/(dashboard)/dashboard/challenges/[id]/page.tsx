"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Trophy,
  Clock,
  Users,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

import {
  useChallengeLeaderboard,
  useSubmitVote,
  useJoinChallenge,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/user-avatar";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function ChallengeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const challengeId = params.id as string;

  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>("");
  const [voteAmount, setVoteAmount] = useState<number>(0);
  const [currentVote, setCurrentVote] = useState<number>(0);

  const { data, isLoading, error } = useChallengeLeaderboard(challengeId);
  const submitVoteMutation = useSubmitVote();
  const joinChallengeMutation = useJoinChallenge();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Challenge Not Found</h3>
        <p className="text-muted-foreground mb-4">
          This challenge may have been deleted or you don&apos;t have access.
        </p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const { challenge, commitment_name, commitment_unit, entries, current_user_id } = data;
  const isActive = challenge.status === "active" && new Date() < new Date(challenge.ends_at);
  const isMember = entries.some((e) => e.user_id === current_user_id);

  const getTimeRemaining = () => {
    const end = new Date(challenge.ends_at);
    const now = new Date();
    if (now >= end) return "Ended";
    return formatDistanceToNow(end, { addSuffix: true });
  };

  const openVoteDialog = (userId: string, userName: string, existingVote: number) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    setCurrentVote(existingVote);
    setVoteAmount(existingVote || 0);
    setVoteDialogOpen(true);
  };

  const handleVote = async () => {
    if (!selectedUserId) return;

    try {
      await submitVoteMutation.mutateAsync({
        challenge_id: challengeId,
        target_user_id: selectedUserId,
        reps: voteAmount,
      });
      toast.success("Vote submitted!");
      setVoteDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to vote");
    }
  };

  const handleJoin = async () => {
    try {
      await joinChallengeMutation.mutateAsync(challengeId);
      toast.success("Joined challenge!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to join");
    }
  };

  const getRankDisplay = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Trophy className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Trophy className="h-5 w-5 text-amber-600" />;
    return <span className="text-muted-foreground">{index + 1}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/challenges">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-500" />
            {challenge.name}
          </h1>
          <p className="text-muted-foreground">
            {commitment_name} - Max {challenge.max_units} {commitment_unit}
          </p>
        </div>
        <Badge variant={isActive ? "default" : "secondary"}>
          {isActive ? "Active" : "Archived"}
        </Badge>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Time Remaining</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{getTimeRemaining()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Participants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{entries.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Max Units</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {challenge.max_units} {commitment_unit}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Join Button (if not member) */}
      {!isMember && isActive && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <h3 className="text-lg font-semibold mb-2">Join this Challenge</h3>
            <p className="text-muted-foreground text-center mb-4">
              Compete with others and get your reps verified by peers!
            </p>
            <Button onClick={handleJoin} disabled={joinChallengeMutation.isPending}>
              {joinChallengeMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Join Challenge
            </Button>
          </CardContent>
        </Card>
      )}

      {/* How it works */}
      {isMember && isActive && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">How Voting Works</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>1. You cannot vote for yourself - others must verify your reps.</p>
            <p>2. Each person needs at least 2 votes to qualify for the leaderboard.</p>
            <p>3. The lowest vote becomes your final score (prevents inflation).</p>
            <p>4. You can only increase your vote, never decrease it.</p>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription>
            {isActive
              ? "Rankings based on minimum agreed votes (2+ voters required)"
              : "Final rankings"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No participants yet. Be the first to join!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead className="text-right">Votes</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  {isActive && isMember && <TableHead className="text-right">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry, index) => {
                  const isCurrentUser = entry.user_id === current_user_id;
                  const myVote = entry.votes[current_user_id] || 0;
                  const score = challenge.status === "archived"
                    ? entry.final_reps
                    : entry.agreed_reps;
                  const needsMoreVotes = entry.vote_count < 2;

                  return (
                    <motion.tr
                      key={entry.user_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={isCurrentUser ? "bg-muted/50" : ""}
                    >
                      <TableCell>{getRankDisplay(index)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            name={entry.user_name}
                            avatarUrl={entry.user_avatar_url}
                            className="h-8 w-8"
                          />
                          <span className="font-medium">
                            {entry.user_name}
                            {isCurrentUser && " (You)"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{entry.vote_count}</span>
                          {needsMoreVotes && (
                            <Badge variant="outline" className="ml-1 text-xs">
                              Needs {2 - entry.vote_count} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {score !== null ? (
                          <span className="font-bold">
                            {score} {commitment_unit}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      {isActive && isMember && (
                        <TableCell className="text-right">
                          {isCurrentUser ? (
                            <span className="text-muted-foreground text-sm">
                              Can&apos;t self-vote
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant={myVote > 0 ? "outline" : "default"}
                              onClick={() => openVoteDialog(entry.user_id, entry.user_name, myVote)}
                            >
                              {myVote > 0 ? (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" />
                                  {myVote}
                                </>
                              ) : (
                                "Vote"
                              )}
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Vote Dialog */}
      <Dialog open={voteDialogOpen} onOpenChange={setVoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vote for {selectedUserName}</DialogTitle>
            <DialogDescription>
              How many {commitment_unit} did they complete?
              {currentVote > 0 && ` (Current vote: ${currentVote})`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="voteAmount">
              {commitment_unit} (max: {challenge.max_units})
            </Label>
            <Input
              id="voteAmount"
              type="number"
              min={currentVote}
              max={challenge.max_units}
              value={voteAmount}
              onChange={(e) => setVoteAmount(parseInt(e.target.value) || 0)}
              className="mt-2"
            />
            {currentVote > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                You can only increase from your current vote of {currentVote}.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={handleVote}
              disabled={
                submitVoteMutation.isPending ||
                voteAmount < currentVote ||
                voteAmount > challenge.max_units
              }
            >
              {submitVoteMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {currentVote > 0 ? "Update Vote" : "Submit Vote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
