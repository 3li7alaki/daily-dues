import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  uploadAvatar,
  deleteAvatar,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZES,
} from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.images.includes(file.type as typeof ALLOWED_FILE_TYPES.images[number])) {
      return NextResponse.json(
        { error: "Invalid file type. Only images are allowed." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZES.avatar) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 2MB." },
        { status: 400 }
      );
    }

    // Get current avatar URL to delete old one
    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .single();

    // Use admin client for storage operations to bypass RLS
    const adminClient = createAdminClient();

    // Upload new avatar
    const result = await uploadAvatar(adminClient, {
      userId: user.id,
      file,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Upload failed" },
        { status: 500 }
      );
    }

    // Update profile with new avatar URL
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: result.publicUrl })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    // Delete old avatar if it exists and is from our storage
    if (profile?.avatar_url && profile.avatar_url.includes("/storage/")) {
      await deleteAvatar(adminClient, profile.avatar_url);
    }

    return NextResponse.json({
      success: true,
      url: result.publicUrl,
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
