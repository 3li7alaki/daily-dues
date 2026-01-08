"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Loader2,
  Trophy,
  Clock,
  Users,
  Archive,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

import {
  useChallenges,
  useCommitments,
  useCreateChallenge,
  useArchiveChallenge,
  useSendChallengeResults,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useRealm } from "@/contexts/realm-context";
import type { ChallengeWithDetails } from "@/lib/queries";

interface ChallengeForm {
  name: string;
  description: string;
  commitment_id: string;
  duration_hours: number;
  max_units: number;
}

const defaultForm: ChallengeForm = {
  name: "",
  description: "",
  commitment_id: "",
  duration_hours: 24,
  max_units: 100,
};

export function ChallengesManager() {
  const [form, setForm] = useState<ChallengeForm>(defaultForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [challengeToArchive, setChallengeToArchive] = useState<ChallengeWithDetails | null>(null);
  const { currentRealm } = useRealm();

  const { data: challenges = [], isLoading: loadingChallenges } = useChallenges(currentRealm?.id);
  const { data: commitments = [] } = useCommitments();
  const createChallengeMutation = useCreateChallenge();
  const archiveChallengeMutation = useArchiveChallenge();
  const sendResultsMutation = useSendChallengeResults();

  // Filter commitments by current realm
  const realmCommitments = currentRealm
    ? commitments.filter((c) => c.realm_id === currentRealm.id && c.is_active)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentRealm) {
      toast.error("Please select a realm first");
      return;
    }

    if (!form.commitment_id) {
      toast.error("Please select a commitment");
      return;
    }

    try {
      await createChallengeMutation.mutateAsync({
        ...form,
        realm_id: currentRealm.id,
      });
      toast.success("Challenge created!");
      setDialogOpen(false);
      setForm(defaultForm);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create challenge");
    }
  };

  const openArchiveDialog = (challenge: ChallengeWithDetails) => {
    setChallengeToArchive(challenge);
    setArchiveDialogOpen(true);
  };

  const confirmArchive = async () => {
    if (!challengeToArchive) return;

    try {
      await archiveChallengeMutation.mutateAsync(challengeToArchive.id);
      toast.success("Challenge archived!");
      setArchiveDialogOpen(false);
      setChallengeToArchive(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to archive challenge");
    }
  };

  const handleSendResults = async (challengeId: string) => {
    try {
      await sendResultsMutation.mutateAsync(challengeId);
      toast.success("Results sent to Slack!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send results");
    }
  };

  const getTimeRemaining = (endsAt: string) => {
    const end = new Date(endsAt);
    const now = new Date();
    if (now >= end) return "Ended";
    return formatDistanceToNow(end, { addSuffix: true });
  };

  // Separate active and archived challenges
  const activeChallenges = challenges.filter((c) => c.status === "active");
  const archivedChallenges = challenges.filter((c) => c.status === "archived");

  if (!currentRealm) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Please select a realm to manage challenges.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Challenge Button */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Challenge
          </Button>
        </DialogTrigger>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Create Challenge</DialogTitle>
              <DialogDescription>
                Create a time-limited competition for {currentRealm.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Weekend Warrior Challenge"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Push your limits this weekend!"
                  rows={2}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="commitment">Commitment</Label>
                <Select
                  value={form.commitment_id}
                  onValueChange={(value) => setForm({ ...form, commitment_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select commitment" />
                  </SelectTrigger>
                  <SelectContent>
                    {realmCommitments.map((commitment) => (
                      <SelectItem key={commitment.id} value={commitment.id}>
                        {commitment.name} ({commitment.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="duration">Duration (hours)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={1}
                    value={form.duration_hours}
                    onChange={(e) => setForm({ ...form, duration_hours: parseInt(e.target.value) || 24 })}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="maxUnits">Max Units</Label>
                  <Input
                    id="maxUnits"
                    type="number"
                    min={1}
                    value={form.max_units}
                    onChange={(e) => setForm({ ...form, max_units: parseInt(e.target.value) || 100 })}
                    required
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={createChallengeMutation.isPending}
              >
                {createChallengeMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Create Challenge
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Active Challenges */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Active Challenges
        </h2>

        {loadingChallenges ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : activeChallenges.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No active challenges. Create one to get started!
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {activeChallenges.map((challenge) => (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {challenge.name}
                            <Badge variant="default">Active</Badge>
                          </CardTitle>
                          <CardDescription>
                            {challenge.commitment.name} - Max {challenge.max_units} {challenge.commitment.unit}
                          </CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openArchiveDialog(challenge)}
                        >
                          <Archive className="h-4 w-4 mr-1" />
                          End
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>Ends {getTimeRemaining(challenge.ends_at)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{challenge.member_count} participants</span>
                        </div>
                      </div>
                      {challenge.description && (
                        <p className="mt-2 text-sm">{challenge.description}</p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Archived Challenges */}
      {archivedChallenges.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Archive className="h-5 w-5 text-muted-foreground" />
            Archived Challenges
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            {archivedChallenges.map((challenge) => (
              <Card key={challenge.id} className="opacity-75">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {challenge.name}
                        <Badge variant="secondary">Archived</Badge>
                      </CardTitle>
                      <CardDescription>
                        {challenge.commitment.name} - {challenge.member_count} participants
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendResults(challenge.id)}
                      disabled={sendResultsMutation.isPending}
                    >
                      {sendResultsMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-1" />
                          Send Results
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Ran for {challenge.duration_hours} hours
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Challenge?</AlertDialogTitle>
            <AlertDialogDescription>
              This will end &quot;{challengeToArchive?.name}&quot; and calculate final scores.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmArchive}
              disabled={archiveChallengeMutation.isPending}
            >
              {archiveChallengeMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              End Challenge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
