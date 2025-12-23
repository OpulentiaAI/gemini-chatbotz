import { handleUpload } from "@vercel/blob/client";
import { NextResponse } from "next/server";

const MAX_FILE_SIZE_BYTES = 32 * 1024 * 1024; // 32MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf", "image/gif", "image/webp"];

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  // Use the new handleUpload signature that requires the request body.
  // Cast body to satisfy @vercel/blob type requirements
  return handleUpload({
    request,
    body: request.body as any,
    onBeforeGenerateToken: async () => ({
      allowedContentTypes: ALLOWED_TYPES,
      maximumSizeInBytes: MAX_FILE_SIZE_BYTES,
    }),
    onUploadCompleted: async () => {
      // No-op: the client receives blob metadata and handles Convex ingestion.
    },
  }).catch((error) => {
    console.error("Upload failed", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  });
}
