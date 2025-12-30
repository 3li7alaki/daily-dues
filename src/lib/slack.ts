type SlackEventType =
  | "user_joined"
  | "commitment_logged"
  | "commitment_approved"
  | "commitment_rejected"
  | "streak_milestone"
  | "leaderboard_update"
  | "custom";

interface SlackMessage {
  text: string;
  blocks?: SlackBlock[];
}

interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  elements?: Array<{
    type: string;
    text?: string;
  }>;
  fields?: Array<{
    type: string;
    text: string;
  }>;
}

interface SlackEventPayload {
  userName?: string;
  commitmentName?: string;
  amount?: number;
  unit?: string;
  streak?: number;
  milestone?: number;
  customMessage?: string;
}

class SlackNotifier {
  private webhookUrl: string | null;
  private enabled: boolean;
  private enabledEvents: Set<SlackEventType>;

  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL || null;
    this.enabled = !!this.webhookUrl;
    // By default, enable all events - can be configured later
    this.enabledEvents = new Set([
      "user_joined",
      "commitment_approved",
      "streak_milestone",
      "leaderboard_update",
    ]);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  enableEvent(event: SlackEventType): void {
    this.enabledEvents.add(event);
  }

  disableEvent(event: SlackEventType): void {
    this.enabledEvents.delete(event);
  }

  isEventEnabled(event: SlackEventType): boolean {
    return this.enabledEvents.has(event);
  }

  private formatMessage(
    eventType: SlackEventType,
    payload: SlackEventPayload
  ): SlackMessage {
    switch (eventType) {
      case "user_joined":
        return {
          text: `👋 New user joined: ${payload.userName}`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `👋 *New User Alert!*\n\n*${payload.userName}* has joined Daily Dues. Welcome to the grind! 💪`,
              },
            },
          ],
        };

      case "commitment_logged":
        return {
          text: `📝 ${payload.userName} logged ${payload.amount} ${payload.unit}`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `📝 *Progress Logged*\n\n*${payload.userName}* completed *${payload.amount} ${payload.unit}* of ${payload.commitmentName}`,
              },
            },
          ],
        };

      case "commitment_approved":
        return {
          text: `✅ ${payload.userName}'s ${payload.commitmentName} approved!`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `✅ *Commitment Approved!*\n\n*${payload.userName}* crushed their *${payload.commitmentName}* goal!\n${payload.amount} ${payload.unit} completed 🎯`,
              },
            },
          ],
        };

      case "commitment_rejected":
        return {
          text: `❌ ${payload.userName}'s submission was rejected`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `❌ *Submission Rejected*\n\n*${payload.userName}*'s ${payload.commitmentName} submission was rejected. Time to step up! 💪`,
              },
            },
          ],
        };

      case "streak_milestone":
        return {
          text: `🔥 ${payload.userName} hit a ${payload.milestone}-day streak!`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `🔥 *Streak Milestone!*\n\n*${payload.userName}* just hit a *${payload.milestone}-day streak*! 🏆\n\nIncredible discipline. Keep it up!`,
              },
            },
          ],
        };

      case "leaderboard_update":
        return {
          text: `🏆 Leaderboard updated!`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `🏆 *Leaderboard Update*\n\n${payload.customMessage || "Check the latest standings!"}`,
              },
            },
          ],
        };

      case "custom":
        return {
          text: payload.customMessage || "Daily Dues notification",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: payload.customMessage || "Daily Dues notification",
              },
            },
          ],
        };

      default:
        return { text: "Daily Dues notification" };
    }
  }

  async send(
    eventType: SlackEventType,
    payload: SlackEventPayload
  ): Promise<boolean> {
    if (!this.enabled || !this.webhookUrl) {
      console.log(`[Slack] Disabled or no webhook URL. Event: ${eventType}`);
      return false;
    }

    if (!this.isEventEnabled(eventType)) {
      console.log(`[Slack] Event ${eventType} is disabled`);
      return false;
    }

    const message = this.formatMessage(eventType, payload);

    try {
      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.error(`[Slack] Failed to send: ${response.statusText}`);
        return false;
      }

      console.log(`[Slack] Event ${eventType} sent successfully`);
      return true;
    } catch (error) {
      console.error(`[Slack] Error sending webhook:`, error);
      return false;
    }
  }

  // Convenience methods
  async notifyUserJoined(userName: string): Promise<boolean> {
    return this.send("user_joined", { userName });
  }

  async notifyCommitmentApproved(
    userName: string,
    commitmentName: string,
    amount: number,
    unit: string
  ): Promise<boolean> {
    return this.send("commitment_approved", {
      userName,
      commitmentName,
      amount,
      unit,
    });
  }

  async notifyStreakMilestone(
    userName: string,
    milestone: number
  ): Promise<boolean> {
    return this.send("streak_milestone", { userName, milestone });
  }

  async notifyCustom(message: string): Promise<boolean> {
    return this.send("custom", { customMessage: message });
  }
}

// Singleton instance
export const slack = new SlackNotifier();

// Milestone thresholds for streak notifications
export const STREAK_MILESTONES = [7, 14, 30, 50, 100, 365];

export function shouldNotifyStreakMilestone(streak: number): boolean {
  return STREAK_MILESTONES.includes(streak);
}
