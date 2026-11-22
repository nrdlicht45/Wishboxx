import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

-- Beschenkte (z.B. die eigenen Kinder). Grundlage für KI-Vorschläge.
CREATE TABLE IF NOT EXISTS recipients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  birthdate TEXT,
  gender TEXT NOT NULL DEFAULT 'none',
  interests TEXT NOT NULL DEFAULT '',
  avoid TEXT NOT NULL DEFAULT '',
  owned TEXT NOT NULL DEFAULT '',
  sizes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Wunschlisten / Kisten pro Anlass
CREATE TABLE IF NOT EXISTS lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id INTEGER REFERENCES recipients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  occasion TEXT NOT NULL DEFAULT 'birthday',
  event_date TEXT,
  description TEXT NOT NULL DEFAULT '',
  share_token TEXT NOT NULL UNIQUE,
  reveal_mode TEXT NOT NULL DEFAULT 'status',
  budget_min REAL,
  budget_max REAL,
  shop_name TEXT NOT NULL DEFAULT '',
  shop_address TEXT NOT NULL DEFAULT '',
  payment_hint TEXT NOT NULL DEFAULT '',
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  url TEXT,
  image_url TEXT,
  price REAL,
  quantity INTEGER NOT NULL DEFAULT 1,
  priority INTEGER NOT NULL DEFAULT 2,
  source TEXT NOT NULL DEFAULT 'link',
  is_group_gift INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Reservierungen von Gästen (ohne Account). kind = 'reserve' | 'pledge'
CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'reserve',
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  amount REAL,
  message TEXT NOT NULL DEFAULT '',
  token TEXT NOT NULL UNIQUE,
  thanked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Affiliate-Partner (im Admin-Bereich gepflegt)
CREATE TABLE IF NOT EXISTS affiliate_providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  domains TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'param',
  param_name TEXT NOT NULL DEFAULT '',
  param_value TEXT NOT NULL DEFAULT '',
  link_template TEXT NOT NULL DEFAULT '',
  search_url_template TEXT NOT NULL DEFAULT '',
  use_for_suggestions INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
  provider_id INTEGER REFERENCES affiliate_providers(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Einmal-Links für die Anmeldung ohne Passwort
CREATE TABLE IF NOT EXISTS login_tokens (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  guest_user_id INTEGER,
  next TEXT NOT NULL DEFAULT '/dashboard',
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_items_list ON items(list_id);
CREATE INDEX IF NOT EXISTS idx_res_item ON reservations(item_id);
CREATE INDEX IF NOT EXISTS idx_clicks_provider ON clicks(provider_id);
`;

const DEFAULT_PROVIDERS = [
  {
    name: "Amazon.de (PartnerNet)",
    domains: "amazon.de,amzn.to,amzn.eu",
    mode: "param",
    param_name: "tag",
    param_value: "DEINE-ID-21",
    link_template: "",
    search_url_template: "https://www.amazon.de/s?k={query}",
    use_for_suggestions: 1,
    priority: 10,
  },
  {
    name: "myToys (via AWIN)",
    domains: "mytoys.de",
    mode: "template",
    param_name: "",
    param_value: "",
    link_template:
      "https://www.awin1.com/cread.php?awinmid=MERCHANT_ID&awinaffid=PUBLISHER_ID&ued={url}",
    search_url_template: "https://www.mytoys.de/suche/?query={query}",
    use_for_suggestions: 0,
    priority: 20,
  },
  {
    name: "Thalia (via AWIN)",
    domains: "thalia.de",
    mode: "template",
    param_name: "",
    param_value: "",
    link_template:
      "https://www.awin1.com/cread.php?awinmid=MERCHANT_ID&awinaffid=PUBLISHER_ID&ued={url}",
    search_url_template: "https://www.thalia.de/suche?sq={query}",
    use_for_suggestions: 0,
    priority: 30,
  },
];

/** Spalten nachrüsten, die nach dem ersten Release dazukamen. */
const COLUMN_MIGRATIONS: [table: string, column: string, ddl: string][] = [
  ["reservations", "purchased", "INTEGER NOT NULL DEFAULT 0"],
  ["reservations", "reminder_stage", "INTEGER NOT NULL DEFAULT 0"],
  // Gast-Konten: Box packen ohne Anmeldung, später per E-Mail-Link sichern
  ["users", "is_guest", "INTEGER NOT NULL DEFAULT 0"],
  // Alter ohne Geburtsdatum (Schnellstart fragt nur „Wie alt?“)
  ["recipients", "age_hint", "INTEGER"],
];

function migrate(db: Database.Database) {
  for (const [table, column, ddl] of COLUMN_MIGRATIONS) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!cols.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  }
}

let instance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (instance) return instance;
  const file = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "wishboxx.db");
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);

  const count = db.prepare("SELECT COUNT(*) AS c FROM affiliate_providers").get() as { c: number };
  if (count.c === 0) {
    const insert = db.prepare(
      `INSERT INTO affiliate_providers
       (name, domains, mode, param_name, param_value, link_template, search_url_template, use_for_suggestions, active, priority)
       VALUES (@name, @domains, @mode, @param_name, @param_value, @link_template, @search_url_template, @use_for_suggestions, 0, @priority)`,
    );
    for (const p of DEFAULT_PROVIDERS) insert.run(p);
  }
  migrate(db);
  instance = db;
  return db;
}
