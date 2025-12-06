import { handleUpload } from "@vercel/blob/client";
import { NextResponse } from "next/server";

const MAX_FILE_SIZE_BYTES = 32 * 1024 * 1024; // 32MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf", "image/gif", "image/webp"];

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  // Temporarily disabled due to TypeScript issues
  return NextResponse.json({ error: "Upload temporarily disabled" }, { status: 503 });
}
