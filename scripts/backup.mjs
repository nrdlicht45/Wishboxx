// Konsistentes Online-Backup der SQLite-Datenbank (läuft im Container).
// Aufruf: node scripts/backup.mjs /data/backups
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const src = process.env.DATABASE_PATH || "/data/wishboxx.db";
const dir = process.argv[2] || "/data/backups";
const keep = Number(process.env.BACKUP_KEEP || 14);
fs.mkdirSync(dir, { recursive: true });
const target = path.join(dir, `wishboxx-${new Date().toISOString().slice(0, 10)}.db`);
await new Database(src, { readonly: true }).backup(target);
const old = fs.readdirSync(dir).filter((f) => f.startsWith("wishboxx-")).sort().slice(0, -keep);
for (const f of old) fs.unlinkSync(path.join(dir, f));
console.log(`Backup gespeichert: ${target} (${old.length} alte entfernt)`);
