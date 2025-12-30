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
  addedDirectly?: boolean;
  error?: string;
}

export async function createInvite({
  email: rawEmail,
  realmId,
  realmName,
}: CreateInviteParams): Promise<CreateInviteResult> {
  const supabase = await createClient();
  const email = rawEmail.toLowerCase().trim();

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

  // Check if user with this email already exists (case insensitive)
  const { data: existingUser } = await supabase
    .from("profiles")
    .select("id, name")
    .ilike("email", email)
    .single();

  if (existingUser) {
    // User exists - check if already in this realm
    const { data: existingMembership } = await supabase
      .from("user_realms")
      .select("id")
      .eq("user_id", existingUser.id)
      .eq("realm_id", realmId)
      .single();

    if (existingMembership) {
      return { success: false, error: "User is already a member of this realm" };
    }

    // Add user directly to the realm
    const { error: realmError } = await supabase
      .from("user_realms")
      .insert({
        user_id: existingUser.id,
        realm_id: realmId,
      });

    if (realmError) {
      return { success: false, error: "Failed to add user to realm" };
    }

    return { success: true, addedDirectly: true };
  }

  // User doesn't exist - create invite
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
