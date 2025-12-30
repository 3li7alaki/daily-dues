"use server";

import { createAdminClient } from "@/lib/supabase/server";

interface RegisterParams {
  token: string;
  username: string;
  name: string;
  password: string;
}

interface RegisterResult {
  success: boolean;
  error?: string;
}

export async function registerUser({
  token,
  username: rawUsername,
  name,
  password,
}: RegisterParams): Promise<RegisterResult> {
  const adminClient = createAdminClient();
  const username = rawUsername.toLowerCase().trim();

  // Validate username format
  const usernameRegex = /^[a-z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    return {
      success: false,
      error: "Username can only contain lowercase letters, numbers, and underscores",
    };
  }

  if (username.length < 3 || username.length > 20) {
    return {
      success: false,
      error: "Username must be between 3 and 20 characters",
    };
  }

  // Check if username is taken (case insensitive, use admin client to bypass RLS)
  const { data: existingUser } = await adminClient
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .single();

  if (existingUser) {
    return { success: false, error: "Username is already taken" };
  }

  // Validate invite (use admin client to bypass RLS)
  const { data: invite, error: inviteError } = await adminClient
    .from("invites")
    .select("id, email, realm_id")
    .eq("token", token.trim())
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (inviteError || !invite) {
    return { success: false, error: "Invalid or expired invite token" };
  }

  // Create user with admin client (auto-confirmed)
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true, // Auto-confirm - no verification email
    user_metadata: { name, username },
  });

  if (authError || !authData.user) {
    return { success: false, error: authError?.message || "Failed to create account" };
  }

  // Create profile
  const { error: profileError } = await adminClient
    .from("profiles")
    .insert({
      id: authData.user.id,
      username,
      email: invite.email,
      name,
      role: "user",
    });

  if (profileError) {
    // Rollback: delete the auth user
    await adminClient.auth.admin.deleteUser(authData.user.id);
    console.error("Profile creation error:", profileError);
    return { success: false, error: profileError.message || "Failed to create profile" };
  }

  // Add user to the invite's realm
  const { error: realmError } = await adminClient
    .from("user_realms")
    .insert({
      user_id: authData.user.id,
      realm_id: invite.realm_id,
    });

  if (realmError) {
    // Rollback
    await adminClient.from("profiles").delete().eq("id", authData.user.id);
    await adminClient.auth.admin.deleteUser(authData.user.id);
    return { success: false, error: "Failed to join realm" };
  }

  // Mark invite as used
  await adminClient
    .from("invites")
    .update({ used: true })
    .eq("id", invite.id);

  return { success: true };
}
