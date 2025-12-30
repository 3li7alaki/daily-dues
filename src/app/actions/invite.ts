"use server";

import { createClient } from "@/lib/supabase/server";
import { sendInviteEmail } from "@/lib/email";

interface CreateInviteParams {
  email: string;
  realmId: string;
  realmName: string;
}

interface CreateInviteResult {
  success: boolean;
  token?: string;
  error?: string;
}

export async function createInvite({
  email,
  realmId,
  realmName,
}: CreateInviteParams): Promise<CreateInviteResult> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get inviter's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { success: false, error: "Only admins can send invites" };
  }

  // Generate token
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

  // Create invite
  const { error: inviteError } = await supabase.from("invites").insert({
    email,
    token,
    realm_id: realmId,
    invited_by: user.id,
    expires_at: expiresAt.toISOString(),
  });

  if (inviteError) {
    return { success: false, error: "Failed to create invite" };
  }

  // Send email (non-blocking - don't fail if email fails)
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/register?token=${token}`;

  const emailResult = await sendInviteEmail({
    to: email,
    inviteUrl,
    realmName,
    inviterName: profile.name,
  });

  if (!emailResult.success) {
    console.warn("Email send failed, but invite was created:", emailResult.error);
  }

  return { success: true, token };
}
