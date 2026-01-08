import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Main storage bucket name - set via env or defaults to "public"
 */
export const STORAGE_BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "public";

/**
 * Storage folders within the bucket
 */
export const STORAGE_FOLDERS = {
  AVATARS: "avatars",
  // Add more folders as needed:
  // DOCUMENTS: "documents",
  // MEDIA: "media",
} as const;

export type StorageFolder = (typeof STORAGE_FOLDERS)[keyof typeof STORAGE_FOLDERS];

/**
 * Allowed file types for different upload contexts
 */
export const ALLOWED_FILE_TYPES = {
  images: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  documents: ["application/pdf", "text/plain"],
} as const;

/**
 * Max file sizes in bytes
 */
export const MAX_FILE_SIZES = {
  avatar: 2 * 1024 * 1024, // 2MB
  document: 10 * 1024 * 1024, // 10MB
} as const;

export interface UploadOptions {
  folder: StorageFolder;
  path: string;
  file: File | Blob;
  contentType?: string;
  upsert?: boolean;
}

export interface UploadResult {
  success: boolean;
  path?: string;
  publicUrl?: string;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
}

/**
 * Generate a unique file path with timestamp
 */
export function generateFilePath(
  folder: string,
  fileName: string,
  userId?: string
): string {
  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const parts = [folder];

  if (userId) {
    parts.push(userId);
  }

  parts.push(`${timestamp}-${sanitizedName}`);
  return parts.join("/");
}

/**
 * Get the file extension from a filename or mime type
 */
export function getFileExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName) return fromName;

  const mimeExtensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "application/pdf": "pdf",
  };
  return mimeExtensions[file.type] || "bin";
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: File,
  allowedTypes: readonly string[],
  maxSize: number
): { valid: boolean; error?: string } {
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${allowedTypes.join(", ")}`,
    };
  }

  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / 1024 / 1024);
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  supabase: SupabaseClient,
  options: UploadOptions
): Promise<UploadResult> {
  const { folder, path, file, contentType, upsert = false } = options;

  // Full path includes the folder
  const fullPath = `${folder}/${path}`;

  try {
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(fullPath, file, {
      contentType: contentType || (file instanceof File ? file.type : undefined),
      upsert,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fullPath);

    return {
      success: true,
      path: fullPath,
      publicUrl,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Upload failed",
    };
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(
  supabase: SupabaseClient,
  path: string
): Promise<DeleteResult> {
  try {
    const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Delete failed",
    };
  }
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(
  supabase: SupabaseClient,
  path: string
): string {
  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return publicUrl;
}

/**
 * Extract the storage path from a full public URL
 */
export function extractPathFromUrl(url: string): string | null {
  const pattern = new RegExp(`/storage/v1/object/public/${STORAGE_BUCKET}/(.+)$`);
  const match = url.match(pattern);
  return match ? match[1] : null;
}

// ============================================
// Avatar-specific helpers
// ============================================

export interface AvatarUploadOptions {
  userId: string;
  file: File;
}

/**
 * Upload a user avatar
 */
export async function uploadAvatar(
  supabase: SupabaseClient,
  options: AvatarUploadOptions
): Promise<UploadResult> {
  const { userId, file } = options;

  // Validate the file
  const validation = validateFile(
    file,
    ALLOWED_FILE_TYPES.images,
    MAX_FILE_SIZES.avatar
  );

  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Generate path: {userId}/{timestamp}-avatar.{ext}
  const ext = getFileExtension(file);
  const path = `${userId}/${Date.now()}-avatar.${ext}`;

  return uploadFile(supabase, {
    folder: STORAGE_FOLDERS.AVATARS,
    path,
    file,
    upsert: true,
  });
}

/**
 * Delete a user's avatar by URL
 */
export async function deleteAvatar(
  supabase: SupabaseClient,
  avatarUrl: string
): Promise<DeleteResult> {
  const path = extractPathFromUrl(avatarUrl);

  if (!path) {
    return { success: false, error: "Invalid avatar URL" };
  }

  return deleteFile(supabase, path);
}
