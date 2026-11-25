import { supabaseAdmin } from "../config/subabase.js";

export class StorageService {
  static async uploadProfileImage(
    image: unknown,
    userId: string,
  ): Promise<string | null> {
    if (!image) return null;

    if (typeof image !== "string") {
      throw {
        status: 400,
        message: "profileImageBase64 must be a base64 string",
        code: "INVALID_IMAGE",
      };
    }

    const match = image.match(
      /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/,
    );
    if (!match) {
      throw {
        status: 400,
        message: "Unsupported image format. Use JPG, PNG or WEBP.",
        code: "INVALID_IMAGE_FORMAT",
      };
    }

    const mime = match[1];
    const buffer = Buffer.from(match[2], "base64");
    if (!buffer.length || buffer.length > 5 * 1024 * 1024) {
      throw {
        status: 400,
        message: "Image must be smaller than 5 MB",
        code: "IMAGE_SIZE_INVALID",
      };
    }

    const ext = mime === "image/jpeg" ? "jpg" : mime.split("/")[1];
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "profile-images";
    const path = `${userId}/${Date.now()}.${ext}`;

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType: mime,
        upsert: true,
        cacheControl: "3600",
      });

    if (error || !data) {
      throw {
        status: 502,
        message: error?.message || "Image upload failed",
        code: "IMAGE_UPLOAD_FAILED",
      };
    }

    const { data: publicData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicData.publicUrl;
  }
}
