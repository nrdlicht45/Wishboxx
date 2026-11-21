import fs from "node:fs";
import path from "node:path";
import { uploadDir, UPLOAD_PATH_RE } from "@/lib/uploads";

const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const file = (await params).file;
  if (!UPLOAD_PATH_RE.test(`/uploads/${file}`)) return new Response("Not found", { status: 404 });
  const full = path.join(uploadDir(), file);
  if (!fs.existsSync(full)) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(fs.readFileSync(full)), {
    headers: {
      "content-type": MIME[file.split(".").pop()!],
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
