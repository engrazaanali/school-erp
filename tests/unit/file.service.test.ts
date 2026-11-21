import { describe, it, expect, vi, beforeEach } from "vitest";
import { FileService, MAX_FILE_SIZE_BYTES } from "@/server/services/file.service";
import { BadRequestError, NotFoundError } from "@/lib/utils/api-response";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    fileRecord: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    fileAccessLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/logging", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("FileService — Private Storage & Access Controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthorized file MIME types (e.g. executable/script)", async () => {
    await expect(
      FileService.registerFile({
        organizationId: "org-1",
        fileName: "malicious.sh",
        mimeType: "application/x-sh",
        fileSize: 1024,
      })
    ).rejects.toThrowError(BadRequestError);
  });

  it("rejects files exceeding the maximum size limit (10MB)", async () => {
    await expect(
      FileService.registerFile({
        organizationId: "org-1",
        fileName: "huge-report.pdf",
        mimeType: "application/pdf",
        fileSize: MAX_FILE_SIZE_BYTES + 1,
      })
    ).rejects.toThrowError(BadRequestError);
  });

  it("registers valid private files with safe sanitized storage keys", async () => {
    const mockCreate = vi.mocked(prisma.fileRecord.create);
    mockCreate.mockResolvedValue({
      id: "file-uuid-1",
      storageKey: "org-1/campus-1/random-student_doc.pdf",
      fileName: "student_doc.pdf",
    } as any);

    const file = await FileService.registerFile({
      organizationId: "org-1",
      campusId: "campus-1",
      fileName: "student doc.pdf",
      mimeType: "application/pdf",
      fileSize: 50000,
    });

    expect(file.id).toBe("file-uuid-1");
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const payload = mockCreate.mock.calls[0]?.[0]?.data as any;
    expect(payload.isPrivate).toBe(true);
    expect(payload.storageKey).toContain("org-1/campus-1/");
  });

  it("generates time-limited signed URLs and verifies valid signatures", async () => {
    vi.mocked(prisma.fileRecord.findFirst).mockResolvedValue({
      id: "file-123",
      organizationId: "org-1",
      deletedAt: null,
    } as any);

    const result = await FileService.getSignedUrl({
      fileId: "file-123",
      organizationId: "org-1",
      expiresInSeconds: 300,
    });

    expect(result.signedUrl).toContain("fileId=file-123");
    expect(result.signedUrl).toContain("sig=");

    const url = new URL(`http://localhost${result.signedUrl}`);
    const fileId = url.searchParams.get("fileId")!;
    const expires = parseInt(url.searchParams.get("expires")!, 10);
    const sig = url.searchParams.get("sig")!;

    // Verification succeeds
    expect(FileService.verifySignedUrl(fileId, expires, sig)).toBe(true);

    // Tampered expires fails
    expect(FileService.verifySignedUrl(fileId, expires + 1, sig)).toBe(false);

    // Expired timestamp fails
    expect(FileService.verifySignedUrl(fileId, Date.now() - 1000, sig)).toBe(false);
  });

  it("enforces tenant boundary on signed URL requests", async () => {
    vi.mocked(prisma.fileRecord.findFirst).mockResolvedValue(null);

    await expect(
      FileService.getSignedUrl({
        fileId: "file-other-org",
        organizationId: "org-1",
      })
    ).rejects.toThrowError(NotFoundError);
  });
});
