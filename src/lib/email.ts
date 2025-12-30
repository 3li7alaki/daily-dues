import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface SendInviteEmailParams {
  to: string;
  inviteUrl: string;
  realmName: string;
  inviterName: string;
}

export async function sendInviteEmail({
  to,
  inviteUrl,
  realmName,
  inviterName,
}: SendInviteEmailParams): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log("Resend not configured - invite email skipped");
    return { success: true }; // Silently succeed if not configured
  }

  try {
    const { error } = await resend.emails.send({
      from: "Daily Dues <noreply@daily-dues.area-51.cloud>",
      to,
      subject: `You're invited to join ${realmName} on Daily Dues`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #1a1a1a 0%, #333333 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800;">DD</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 14px;">Daily Dues</p>
            </div>
            <div style="padding: 32px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #1a1a1a;">You're Invited!</h2>
              <p style="color: #52525b; margin: 0 0 24px 0; line-height: 1.6;">
                <strong>${inviterName}</strong> has invited you to join <strong>${realmName}</strong> on Daily Dues -
                a platform for tracking daily commitments and staying accountable.
              </p>
              <a href="${inviteUrl}" style="display: inline-block; background: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Accept Invitation
              </a>
              <p style="color: #a1a1aa; margin: 24px 0 0 0; font-size: 13px; line-height: 1.5;">
                This invite link will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>
            <div style="background: #f4f4f5; padding: 20px 32px; text-align: center;">
              <p style="color: #71717a; margin: 0; font-size: 12px;">
                Daily Dues - Track your commitments, stay accountable.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send invite email:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Failed to send invite email:", err);
    return { success: false, error: "Failed to send email" };
  }
}
