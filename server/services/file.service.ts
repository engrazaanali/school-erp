import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { BadRequestError, NotFoundError, ForbiddenError } from "@/lib/utils/api-response";
import { logger } from "@/lib/logging";

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export interface RegisterFileInput {
  organizationId: string;
  campusId?: string | null;
  uploadedById?: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export interface SignedUrlResult {
  fileId: string;
  signedUrl: string;
  expiresAt: Date;
}

export class FileService {
  /**
   * Registers and authorizes a private file record following strict security controls:
   * MIME validation, size check, safe key generation, private bucket enforcement.
   */
  public static async registerFile(input: RegisterFileInput) {
    const { organizationId, campusId, uploadedById, fileName, mimeType, fileSize } = input;

    // 1. MIME check
    if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
      throw new BadRequestError(
        `File type '${mimeType}' is not permitted. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`
      );
    }

    // 2. Size check
    if (fileSize > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestError(
        `File size (${(fileSize / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowed limit (10MB).`
      );
    }

    // 3. Safe object key generation
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_").toLowerCase();
    const safeStorageKey = `${organizationId}/${campusId || "global"}/${crypto.randomUUID()}-${sanitizedName}`;
    const bucketName = process.env.STORAGE_BUCKET_NAME || "school-erp-private";

    // 4. Create FileRecord
    const file = await prisma.fileRecord.create({
      data: {
        organizationId,
        campusId: campusId ?? null,
        uploadedById: uploadedById ?? null,
        fileName: sanitizedName,
        mimeType: mimeType.toLowerCase(),
        fileSize,
        storageKey: safeStorageKey,
        bucketName,
        isPrivate: true,
      },
    });

    logger.info("Private file registered", {
      fileId: file.id,
      storageKey: file.storageKey,
      organizationId,
    });

    return file;
  }

  /**
   * Generates a time-limited signed URL for authorized private access.
   */
  public static async getSignedUrl(params: {
    fileId: string;
    organizationId: string;
    userId?: string | null;
    ipAddress?: string | null;
    expiresInSeconds?: number;
  }): Promise<SignedUrlResult> {
    const { fileId, organizationId, userId, ipAddress, expiresInSeconds = 3600 } = params;

    const file = await prisma.fileRecord.findFirst({
      where: {
        id: fileId,
        organizationId, // Strict tenant check
        deletedAt: null,
      },
    });

    if (!file) {
      throw new NotFoundError("File not found or access denied.");
    }

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const secret = process.env.AUTH_SECRET || "default-storage-secret";
    const payload = `${file.id}:${expiresAt.getTime()}`;
    const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    const signedUrl = `/api/files/download?fileId=${file.id}&expires=${expiresAt.getTime()}&sig=${signature}`;

    // Log private file access
    await prisma.fileAccessLog.create({
      data: {
        fileId: file.id,
        userId: userId ?? null,
        ipAddress: ipAddress ?? null,
      },
    });

    return {
      fileId: file.id,
      signedUrl,
      expiresAt,
    };
  }

  /**
   * Verifies signature of signed URL.
   */
  public static verifySignedUrl(fileId: string, expires: number, sig: string): boolean {
    if (Date.now() > expires) {
      return false;
    }
    const secret = process.env.AUTH_SECRET || "default-storage-secret";
    const payload = `${fileId}:${expires}`;
    const expectedSig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expectedSig, "hex"));
  }
}
