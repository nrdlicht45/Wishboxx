import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const UPLOAD_PATH_RE = /^\/uploads\/[a-f0-9]{32}\.(jpg|png|webp)$/;

export function uploadDir(): string {
  const base = process.env.UPLOAD_DIR || path.join(path.dirname(process.env.DATABASE_PATH || "./data/x.db"), "uploads");
  fs.mkdirSync(base, { recursive: true });
  return base;
}

/** Erkennt den Bildtyp anhand der Magic Bytes – Dateiendung/Content-Type des Clients wird ignoriert. */
export function sniffImage(buf: Buffer): { ext: "jpg" | "png" | "webp"; mime: "image/jpeg" | "image/png" | "image/webp" } | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { ext: "png", mime: "image/png" };
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP")
    return { ext: "webp", mime: "image/webp" };
  return null;
}

export function saveUpload(buf: Buffer, ext: string): string {
  const name = `${crypto.randomBytes(16).toString("hex")}.${ext}`;
  fs.writeFileSync(path.join(uploadDir(), name), buf);
  return `/uploads/${name}`;
}
