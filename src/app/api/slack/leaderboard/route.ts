import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface LeaderboardEntryPayload {
  userName: string;
  currentStreak: number;
  totalCompleted: number;
  pendingCarryOver: number;
}

interface SlackLeaderboardRequest {
  commitmentName: string;
  unit: string;
  sortBy?: "streak" | "reps";
  entries: LeaderboardEntryPayload[];
}

function getRankEmoji(rank: number): string {
  switch (rank) {
    case 1:
      return ":first_place_medal:";
    case 2:
      return ":second_place_medal:";
    case 3:
      return ":third_place_medal:";
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

function buildSlackBlocks(data: SlackLeaderboardRequest) {
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const isTotalMode = data.sortBy === "reps";
  const sortLabel = isTotalMode ? `by Total ${data.unit}` : "by Streak";

  const blocks: object[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `:trophy: ${data.commitmentName} Leaderboard`,
        emoji: true,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `:calendar: ${date} • ${sortLabel}`,
        },
      ],
    },
    {
      type: "divider",
    },
  ];

  // Top 3 with special formatting
  const top3 = data.entries.slice(0, 3);
  if (top3.length > 0) {
    const podiumText = top3
      .map((entry, index) => {
        const rank = index + 1;
        const emoji = getRankEmoji(rank);

        if (isTotalMode) {
          const title = getRepsTitle(entry.totalCompleted);
          return `${emoji} *${entry.userName}*\n      :dart: ${entry.totalCompleted} ${data.unit} • _${title}_`;
        } else {
          const title = getRankTitle(entry.currentStreak);
          const debtText =
            entry.pendingCarryOver > 0
              ? ` | :warning: ${entry.pendingCarryOver} ${data.unit} debt`
              : "";
          return `${emoji} *${entry.userName}*\n      :fire: ${entry.currentStreak} day streak • _${title}_${debtText}`;
        }
      })
      .join("\n\n");

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: podiumText,
      },
    });
  }

  // Rest of the leaderboard
  const rest = data.entries.slice(3, 10);
  if (rest.length > 0) {
    blocks.push({
      type: "divider",
    });

    const restText = rest
      .map((entry, index) => {
        const rank = index + 4;

        if (isTotalMode) {
          const title = getRepsTitle(entry.totalCompleted);
          return `${rank}. *${entry.userName}* — :dart: ${entry.totalCompleted} ${data.unit} • _${title}_`;
        } else {
          const title = getRankTitle(entry.currentStreak);
          const debtText =
            entry.pendingCarryOver > 0
              ? ` | ${entry.pendingCarryOver} debt`
              : "";
          return `${rank}. *${entry.userName}* — :fire: ${entry.currentStreak} days • _${title}_${debtText}`;
        }
      })
      .join("\n");

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: restText,
      },
    });
  }

  blocks.push(
    {
      type: "divider",
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: ":muscle: Keep pushing! Consistency is key.",
        },
      ],
    }
  );

  return blocks;
}

export async function POST(request: NextRequest) {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
      return NextResponse.json(
        { error: "Slack webhook not configured" },
        { status: 500 }
      );
    }

    // Verify user is admin
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const data: SlackLeaderboardRequest = await request.json();

    if (!data.commitmentName || !data.entries || data.entries.length === 0) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    const blocks = buildSlackBlocks(data);

    const slackResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: `🏆 ${data.commitmentName} Leaderboard Update`,
        blocks,
      }),
    });

    if (!slackResponse.ok) {
      const errorText = await slackResponse.text();
      console.error("[Slack] Failed to send:", errorText);
      return NextResponse.json(
        { error: "Failed to send to Slack" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Slack Leaderboard]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
