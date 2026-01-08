"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Trophy,
  Flame,
  Medal,
  Share2,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { LeaderboardEntry } from "@/lib/queries";
import type { Commitment } from "@/types/database";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  commitment?: Commitment;
  isAdmin?: boolean;
  sortBy?: "streak" | "reps";
}

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Medal className="h-5 w-5 text-amber-600" />;
    default:
      return <span className="text-muted-foreground font-mono">{rank}</span>;
  }
}

function getRankEmoji(rank: number): string {
  switch (rank) {
    case 1:
      return "🥇";
    case 2:
      return "🥈";
    case 3:
      return "🥉";
    default:
      return `${rank}.`;
  }
}

function getRankTitle(streak: number): string {
  if (streak >= 100) return "Legend";
  if (streak >= 50) return "Master";
  if (streak >= 30) return "Veteran";
  if (streak >= 14) return "Committed";
  if (streak >= 7) return "Rising";
  if (streak >= 3) return "Beginner";
  return "Novice";
}

function getRepsTitle(reps: number): string {
  if (reps >= 10000) return "Legend";
  if (reps >= 5000) return "Elite";
  if (reps >= 1000) return "Pro";
  if (reps >= 500) return "Dedicated";
  if (reps >= 100) return "Active";
  if (reps >= 50) return "Rising";
  return "Starter";
}

export function LeaderboardTable({
  entries,
  commitment,
  isAdmin = false,
  sortBy = "streak",
}: LeaderboardTableProps) {
  const [copied, setCopied] = useState(false);
  const [sendingToSlack, setSendingToSlack] = useState(false);

  const unit = commitment?.unit || "";

  const generateShareText = () => {
    const date = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let text = `🏆 *${commitment?.name || "Commitment"} Leaderboard*\n`;
    text += `📅 ${date}\n\n`;

    entries.slice(0, 10).forEach((entry, index) => {
      const rank = index + 1;
      const emoji = getRankEmoji(rank);
      const title = getRankTitle(entry.current_streak);
      text += `${emoji} *${entry.user.name}*\n`;
      text += `   🔥 ${entry.current_streak} day streak • ${title}\n\n`;
    });

    text += `\n💪 Keep pushing! Join the grind.`;
    return text;
  };

  const copyToClipboard = () => {
    const text = generateShareText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Leaderboard copied! Paste in WhatsApp.");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(generateShareText());
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const shareToSlack = async () => {
    if (!commitment) return;

    setSendingToSlack(true);
    try {
      const response = await fetch("/api/slack/leaderboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          commitmentName: commitment.name,
          unit: commitment.unit,
          entries: entries.slice(0, 10).map((entry) => ({
            userName: entry.user.name,
            currentStreak: entry.current_streak,
            pendingCarryOver: entry.pending_carry_over || 0,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send");
      }

      toast.success("Leaderboard sent to Slack!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send to Slack"
      );
    } finally {
      setSendingToSlack(false);
    }
  };

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No entries yet</h3>
          <p className="text-muted-foreground">
            {commitment
              ? `No one has started ${commitment.name} yet!`
              : "Select a commitment to see the leaderboard."}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Top 3 cards
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="space-y-6">
      {/* Share Button */}
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={copyToClipboard}>
              {copied ? (
                <Check className="h-4 w-4 mr-2 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              Copy as Text
            </DropdownMenuItem>
            <DropdownMenuItem onClick={shareToWhatsApp}>
              <svg
                className="h-4 w-4 mr-2"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Share to WhatsApp
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onClick={shareToSlack} disabled={sendingToSlack}>
                {sendingToSlack ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <svg
                    className="h-4 w-4 mr-2"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                  </svg>
                )}
                {sendingToSlack ? "Sending..." : "Send to Slack"}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Top 3 Podium */}
      <div className="grid gap-4 md:grid-cols-3">
        {top3.map((entry, index) => {
          const rank = index + 1;
          const debt = entry.pending_carry_over || 0;
          const bgColors = [
            "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30",
            "from-gray-400/20 to-gray-400/5 border-gray-400/30",
            "from-amber-600/20 to-amber-600/5 border-amber-600/30",
          ];

          return (
            <motion.div
              key={entry.user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className={`bg-gradient-to-br ${bgColors[index]} border-2`}>
                <CardHeader className="text-center pb-2">
                  <div className="relative">
                    <div className="p-1 rounded-full flex items-center justify-center absolute left-[57%] -top-2 transform -translate-x-1/2 z-10 mb-2">
                      {getRankIcon(rank)}
                    </div>
                    <UserAvatar
                      name={entry.user.name}
                      avatarUrl={entry.user.avatar_url}
                      className="h-16 w-16 mx-auto mb-2"
                      fallbackClassName="text-xl"
                    />
                  </div>
                  <CardTitle className="text-lg">{entry.user.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {sortBy === "reps"
                      ? getRepsTitle(entry.total_completed)
                      : getRankTitle(entry.current_streak)}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-center gap-1">
                    {sortBy === "reps" ? (
                      <>
                        <Target className="h-4 w-4 text-blue-500" />
                        <span className="font-bold">
                          {entry.total_completed}
                        </span>
                        <span className="text-xs text-muted-foreground">{unit}</span>
                      </>
                    ) : (
                      <>
                        <Flame className="h-4 w-4 text-orange-500" />
                        <span className="font-bold">
                          {entry.current_streak}
                        </span>
                        <span className="text-xs text-muted-foreground">day streak</span>
                      </>
                    )}
                  </div>
                  {debt > 0 && (
                    <div className="flex items-center justify-center gap-1 text-xs text-red-500 bg-red-500/10 rounded-md py-1">
                      <AlertTriangle className="h-3 w-3" />
                      <span>
                        {debt} {unit} debt
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Rest of the leaderboard */}
      {rest.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="text-right">
                    {sortBy === "reps" ? `Total ${unit}` : "Streak"}
                  </TableHead>
                  <TableHead className="text-right">Debt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rest.map((entry, index) => {
                  const debt = entry.pending_carry_over || 0;
                  return (
                    <TableRow key={entry.user.id}>
                      <TableCell>{getRankIcon(index + 4)}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            name={entry.user.name}
                            avatarUrl={entry.user.avatar_url}
                            className="h-8 w-8"
                          />
                          {entry.user.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {sortBy === "reps"
                          ? getRepsTitle(entry.total_completed)
                          : getRankTitle(entry.current_streak)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {sortBy === "reps" ? (
                            <>
                              <Target className="h-4 w-4 text-blue-500" />
                              {entry.total_completed}
                            </>
                          ) : (
                            <>
                              <Flame className="h-4 w-4 text-orange-500" />
                              {entry.current_streak}
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {debt > 0 ? (
                          <span className="text-red-500 font-medium">
                            {debt}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
