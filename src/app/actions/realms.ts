"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Realm } from "@/types/database";

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated", user: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Only admins can manage realms", user: null };
  }

  return { error: null, user };
}

export interface CreateRealmInput {
  name: string;
  slug: string;
  avatar_url?: string;
}

export interface RealmResult {
  success: boolean;
  error?: string;
  data?: Realm;
}

export async function createRealm(input: CreateRealmInput): Promise<RealmResult> {
  const supabase = await createClient();
  const { error: authError, user } = await verifyAdmin(supabase);

  if (authError || !user) {
    return { success: false, error: authError || "Not authenticated" };
  }

  // Validate inputs
  if (!input.name || input.name.trim().length === 0) {
    return { success: false, error: "Name is required" };
  }

  if (!input.slug || input.slug.trim().length === 0) {
    return { success: false, error: "Slug is required" };
  }

  // Validate slug format (lowercase, alphanumeric, hyphens)
  const slugRegex = /^[a-z0-9-]+$/;
  if (!slugRegex.test(input.slug)) {
    return { success: false, error: "Slug must be lowercase with only letters, numbers, and hyphens" };
  }

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("realms")
    .insert({
      name: input.name.trim(),
      slug: input.slug.trim().toLowerCase(),
      avatar_url: input.avatar_url || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    // Check for unique constraint violation
    if (error.code === "23505") {
      return { success: false, error: "A realm with this slug already exists" };
    }
    return { success: false, error: error.message };
  }

  return { success: true, data: data as Realm };
}

export interface UpdateRealmInput {
  id: string;
  name?: string;
  slug?: string;
  avatar_url?: string | null;
}

export async function updateRealm(input: UpdateRealmInput): Promise<RealmResult> {
  const supabase = await createClient();
  const { error: authError } = await verifyAdmin(supabase);

  if (authError) {
    return { success: false, error: authError };
  }

  // Validate inputs if provided
  if (input.name !== undefined && input.name.trim().length === 0) {
    return { success: false, error: "Name cannot be empty" };
  }

  if (input.slug !== undefined) {
    if (input.slug.trim().length === 0) {
      return { success: false, error: "Slug cannot be empty" };
    }
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(input.slug)) {
      return { success: false, error: "Slug must be lowercase with only letters, numbers, and hyphens" };
    }
  }

  const adminClient = createAdminClient();

  // Verify realm exists
  const { data: existing } = await adminClient
    .from("realms")
    .select("id")
    .eq("id", input.id)
    .single();

  if (!existing) {
    return { success: false, error: "Realm not found" };
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updateData.name = input.name.trim();
  if (input.slug !== undefined) updateData.slug = input.slug.trim().toLowerCase();
  if (input.avatar_url !== undefined) updateData.avatar_url = input.avatar_url;

  const { data, error } = await adminClient
    .from("realms")
    .update(updateData)
    .eq("id", input.id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "A realm with this slug already exists" };
    }
    return { success: false, error: error.message };
  }

  return { success: true, data: data as Realm };
}

export interface DeleteRealmResult {
  success: boolean;
  error?: string;
}

export async function deleteRealm(id: string): Promise<DeleteRealmResult> {
  const supabase = await createClient();
  const { error: authError } = await verifyAdmin(supabase);

  if (authError) {
    return { success: false, error: authError };
  }

  const adminClient = createAdminClient();

  // Verify realm exists
  const { data: existing } = await adminClient
    .from("realms")
    .select("id, name")
    .eq("id", id)
    .single();

  if (!existing) {
    return { success: false, error: "Realm not found" };
  }

  const { error } = await adminClient
    .from("realms")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
