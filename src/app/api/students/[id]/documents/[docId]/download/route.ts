import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/roles";
import { StudentRepository } from "@/lib/dal/studentRepository";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id: studentId, docId: documentId } = await context.params;

    // 1. Session verification
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required to access student documents." },
        { status: 401 }
      );
    }

    const session = await verifySessionToken(token);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Invalid or expired session. Please sign in again." },
        { status: 401 }
      );
    }
    const user = session.user;

    // 2. Fetch document record
    const document = await prisma.studentDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        studentId: true,
        originalFileName: true,
        mimeType: true,
        fileSize: true,
        isArchived: true,
        storageKey: true,
        storageProvider: true,
      },
    });

    if (!document || document.studentId !== studentId) {
      return NextResponse.json(
        { error: "Document not found." },
        { status: 404 }
      );
    }

    // 3. Authorization check
    if (user.role === "STUDENT_VIEWER") {
      if (!user.studentId || user.studentId !== studentId) {
        return NextResponse.json(
          { error: "Access denied. You may only download documents belonging to your personal student profile." },
          { status: 403 }
        );
      }
    } else if (!hasPermission(user.role, "VERIFY_STUDENT_DOCUMENTS")) {
      return NextResponse.json(
        { error: "Access denied. Insufficient administrative permission to access student documents." },
        { status: 403 }
      );
    }

    // 4. Secure storage retrieval: signed URL redirect or binary stream
    const { getStorageProviderFor } = await import("@/lib/storage");
    const storage = getStorageProviderFor(document.storageProvider);
    const safeHeaderFileName = document.originalFileName.replace(/["\r\n\\]/g, "_");

    // If cloud storage provider supports signed URLs and request did not explicitly ask for stream, redirect
    const wantsStream = request.nextUrl.searchParams.get("stream") === "true";
    if (!wantsStream && typeof storage.getSignedDownloadUrl === "function") {
      try {
        const signedUrl = await storage.getSignedDownloadUrl(document.storageKey, 60, safeHeaderFileName);
        if (signedUrl) {
          return NextResponse.redirect(signedUrl, 307);
        }
      } catch (signedUrlErr) {
        console.warn("[STORAGE] Signed URL generation failed, falling back to streaming proxy:", signedUrlErr instanceof Error ? signedUrlErr.message : String(signedUrlErr));
      }
    }

    // Streaming fallback (LocalPrivateStorageProvider)
    const dlResult = await StudentRepository.getDocumentForDownload(documentId);
    if (!dlResult.success || !dlResult.data) {
      return NextResponse.json(
        { error: dlResult.error || "Failed to retrieve document content." },
        { status: 404 }
      );
    }

    const { document: docRecord, buffer: fileBuffer } = dlResult.data;
    const { mimeType, originalFileName, fileSize } = docRecord;

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(fileSize),
        "Content-Disposition": `attachment; filename="${safeHeaderFileName}"; filename*=UTF-8''${encodeURIComponent(originalFileName)}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Internal server error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
