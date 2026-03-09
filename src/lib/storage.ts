import { supabase } from "./supabase";
import { logger } from "./logger";

const BUCKET_NAME = "menu-images";

/**
 * Upload an image file to Supabase Storage and return its public URL.
 * Falls back to base64 data URL if storage upload fails.
 */
export async function uploadImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const filePath = `${fileName}`;

  logger.db("UPLOAD", "storage", `uploading ${filePath} (${(file.size / 1024).toFixed(1)}KB)`);

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    logger.error("Storage upload failed, falling back to base64:", error.message);
    // Fallback to base64
    return fileToBase64(file);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  logger.db("UPLOAD", "storage", `success: ${urlData.publicUrl}`);
  return urlData.publicUrl;
}

/**
 * Delete an image from Supabase Storage by its public URL.
 */
export async function deleteStorageImage(publicUrl: string): Promise<void> {
  try {
    const url = new URL(publicUrl);
    const pathParts = url.pathname.split(`/object/public/${BUCKET_NAME}/`);
    if (pathParts.length < 2) return;

    const filePath = pathParts[1];
    logger.db("DELETE", "storage", `removing ${filePath}`);
    await supabase.storage.from(BUCKET_NAME).remove([filePath]);
  } catch {
    // Silently fail - old image cleanup is best-effort
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
