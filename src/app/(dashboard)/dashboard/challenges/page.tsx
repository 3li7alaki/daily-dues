"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Clock, Users, Loader2, ArrowRight, Archive } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

import { useChallenges, useJoinChallenge } from "@/lib/queries";
import { useRealm } from "@/contexts/realm-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function ChallengesPage() {
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const { currentRealm } = useRealm();

  const { data: challenges = [], isLoading } = useChallenges(currentRealm?.id);
  const joinChallengeMutation = useJoinChallenge();

  const activeChallenges = challenges.filter((c) => c.status === "active");
  const archivedChallenges = challenges.filter((c) => c.status === "archived");

  const handleJoin = async (challengeId: string) => {
    setJoiningId(challengeId);
    try {
      await joinChallengeMutation.mutateAsync(challengeId);
      toast.success("Joined challenge!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to join");
    } finally {
      setJoiningId(null);
    }
  };

  const getTimeRemaining = (endsAt: string) => {
    const end = new Date(endsAt);
    const now = new Date();
    if (now >= end) return "Ended";
    return formatDistanceToNow(end, { addSuffix: true });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Challenges</h1>
        <p className="text-muted-foreground">
          Compete in time-limited challenges with peer-verified scoring.
        </p>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            <Trophy className="h-4 w-4" />
            Active ({activeChallenges.length})
          </TabsTrigger>
          <TabsTrigger value="archived" className="gap-2">
            <Archive className="h-4 w-4" />
            Archived ({archivedChallenges.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {activeChallenges.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Challenges</h3>
                <p className="text-muted-foreground">
                  Check back later for new challenges!
                </p>
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
                    <Card className="h-full">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <Trophy className="h-5 w-5 text-yellow-500" />
                              {challenge.name}
                            </CardTitle>
                            <CardDescription>
                              {challenge.commitment.name} - Max {challenge.max_units} {challenge.commitment.unit}
                            </CardDescription>
                          </div>
                          <Badge variant="default">Active</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>Ends {getTimeRemaining(challenge.ends_at)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{challenge.member_count} joined</span>
                          </div>
                        </div>

                        {challenge.description && (
                          <p className="text-sm">{challenge.description}</p>
                        )}

                        <div className="flex gap-2">
                          {challenge.is_member ? (
                            <Button asChild className="flex-1">
                              <Link href={`/dashboard/challenges/${challenge.id}`}>
                                View Challenge
                                <ArrowRight className="h-4 w-4 ml-2" />
                              </Link>
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleJoin(challenge.id)}
                              disabled={joiningId === challenge.id}
                              className="flex-1"
                            >
                              {joiningId === challenge.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : null}
                              Join Challenge
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived" className="mt-6">
          {archivedChallenges.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Archive className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Archived Challenges</h3>
                <p className="text-muted-foreground">
                  Completed challenges will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {archivedChallenges.map((challenge) => (
                <Card key={challenge.id} className="opacity-75">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {challenge.name}
                        </CardTitle>
                        <CardDescription>
                          {challenge.commitment.name} - {challenge.member_count} participants
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">Archived</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" asChild className="w-full">
                      <Link href={`/dashboard/challenges/${challenge.id}`}>
                        View Results
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
