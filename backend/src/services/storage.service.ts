import { supabaseAdmin } from "../config/subabase.js";

type UploadKind = "profile" | "medical-document" | "recording" | "organization-license";

const BUCKETS: Record<UploadKind, string> = {
  profile: process.env.SUPABASE_STORAGE_BUCKET || "profile-images",
  "medical-document":
    process.env.SUPABASE_MEDICAL_DOCS_BUCKET || "medical-documents",
  recording: process.env.SUPABASE_RECORDINGS_BUCKET || "recordings",
  "organization-license":
    process.env.SUPABASE_ORG_LICENSES_BUCKET || "organization-licenses",
};

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
    const bucket = BUCKETS.profile;
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

  /**
   * رفع ملف طبي (مستند / تسجيل) من base64
   * يرجع الـ public URL للتخزين في قاعدة البيانات
   */
  static async uploadMedicalFile(options: {
    base64Data: string;
    ownerId: string;
    kind: "medical-document" | "recording";
    fileName?: string;
    maxSizeMb?: number;
  }): Promise<string> {
    const { base64Data, ownerId, kind, fileName, maxSizeMb = 50 } = options;

    if (!base64Data || typeof base64Data !== "string") {
      throw {
        status: 400,
        message: "fileBase64 is required",
        code: "MISSING_FILE",
      };
    }

    // data:<mime>;base64,<payload>
    const match = base64Data.match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      throw {
        status: 400,
        message: "Invalid base64 data URL format",
        code: "INVALID_FILE_FORMAT",
      };
    }

    const mime = match[1];
    const buffer = Buffer.from(match[2], "base64");
    const maxBytes = maxSizeMb * 1024 * 1024;

    if (!buffer.length || buffer.length > maxBytes) {
      throw {
        status: 400,
        message: `File must be smaller than ${maxSizeMb} MB`,
        code: "FILE_SIZE_INVALID",
      };
    }

    // أنواع مسموحة للمستندات والتسجيلات
    const allowedDocs = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const allowedRecordings = [
      "video/mp4",
      "video/webm",
      "audio/mpeg",
      "audio/mp4",
      "audio/wav",
      "audio/webm",
    ];

    const allowed = kind === "recording" ? allowedRecordings : allowedDocs;
    if (!allowed.includes(mime)) {
      throw {
        status: 400,
        message: `Unsupported file type: ${mime}`,
        code: "UNSUPPORTED_FILE_TYPE",
      };
    }

    const extFromName = fileName?.split(".").pop()?.toLowerCase();
    const extFromMime = mime.split("/")[1]?.replace("mpeg", "mp3") || "bin";
    const ext = extFromName || extFromMime;

    const bucket = BUCKETS[kind];
    const path = `${ownerId}/${Date.now()}.${ext}`;

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType: mime,
        upsert: false,
        cacheControl: "3600",
      });

    if (error || !data) {
      throw {
        status: 502,
        message: error?.message || "File upload failed",
        code: "FILE_UPLOAD_FAILED",
      };
    }

    const { data: publicData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicData.publicUrl;
  }

  /**
   * Upload organization license document (PDF, JPG, PNG) from base64 data URL.
   */
  static async uploadOrganizationLicense(
    base64Data: unknown,
    organizationId: string,
  ): Promise<string> {
    if (!base64Data || typeof base64Data !== "string") {
      throw {
        status: 400,
        message: "licenseDocumentBase64 is required",
        code: "LICENSE_DOCUMENT_REQUIRED",
      };
    }

    const match = base64Data.match(
      /^data:(application\/pdf|image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/,
    );
    if (!match) {
      throw {
        status: 400,
        message: "License must be a PDF, JPG, or PNG base64 data URL.",
        code: "INVALID_LICENSE_FORMAT",
      };
    }

    const mime = match[1];
    const buffer = Buffer.from(match[2], "base64");
    if (!buffer.length || buffer.length > 8 * 1024 * 1024) {
      throw {
        status: 400,
        message: "License document must be smaller than 8 MB",
        code: "LICENSE_SIZE_INVALID",
      };
    }

    const ext = mime === "application/pdf" ? "pdf" : mime === "image/jpeg" ? "jpg" : "png";
    const bucket = BUCKETS["organization-license"];
    const path = `${organizationId}/${Date.now()}.${ext}`;

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
        message: error?.message || "License upload failed",
        code: "LICENSE_UPLOAD_FAILED",
      };
    }

    const { data: publicData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicData.publicUrl;
  }

  /**
   * Create a signed upload URL for direct-to-Supabase session recording upload.
   */
  static async createRecordingUploadUrl(options: {
    providerId: string;
    appointmentId: string | number;
    fileName: string;
    contentType: string;
  }): Promise<{ signedUrl: string; token: string; path: string }> {
    const safeName = options.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${options.providerId}/${options.appointmentId}/${Date.now()}_${safeName}`;
    const bucket = BUCKETS.recording;

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUploadUrl(path);

    if (error || !data) {
      throw {
        status: 502,
        message: error?.message || "Failed to create recording upload URL",
        code: "RECORDING_UPLOAD_URL_FAILED",
      };
    }

    return {
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
    };
  }

  /**
   * Create a short-lived signed download URL for a stored session recording.
   */
  static async createRecordingDownloadUrl(
    storagePath: string,
    expiresInSeconds = 3600,
  ): Promise<string> {
    const bucket = BUCKETS.recording;
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw {
        status: 502,
        message: error?.message || "Failed to create recording playback URL",
        code: "RECORDING_DOWNLOAD_URL_FAILED",
      };
    }

    return data.signedUrl;
  }
}
