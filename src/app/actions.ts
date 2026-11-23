"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import {
  createLoginToken,
  getCurrentUser,
  getOrCreateGuest,
  redeemLoginToken,
  createSession,
  destroySession,
  hashPassword,
  randomToken,
  requireAdmin,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import { buildSearchUrl, detectProviderFromExample, isSafeHttpUrl } from "@/lib/affiliate";
import { draftProviderWithAi } from "@/lib/providerAi";
import { fetchProductMeta } from "@/lib/metadata";
import {
  ageFromBirthdate,
  eventIsOver,
  getItemsWithStatus,
  getList,
  getListByToken,
  getRecipient,
  isItemTaken,
  OCCASIONS,
  REVEAL_MODES,
  GENDERS,
  getActiveProviders,
  recipientAge,
  getMemos,
  nextYearTitle,
  plusOneYear,
  type Item,
  type Recipient,
} from "@/lib/repo";
import { mailConfigured, sendMail } from "@/lib/mailer";
import { recognizeProduct, type RecognizedProduct } from "@/lib/vision";
import { MAX_UPLOAD_BYTES, saveUpload, sniffImage, UPLOAD_PATH_RE } from "@/lib/uploads";
import { appUrl, dateDe } from "@/lib/format";
import { getReservationByToken } from "@/lib/repo";
import { suggestGifts, type GiftIdea, type SuggestionResult } from "@/lib/suggestions";

export type IdeaWithLink = GiftIdea & { url: string | null };
export type IdeasState = Omit<SuggestionResult, "ideas"> & { ideas: IdeaWithLink[]; error?: string };

const str = (fd: FormData, k: string, max = 500) => String(fd.get(k) ?? "").trim().slice(0, max);
const num = (fd: FormData, k: string): number | null => {
  const raw = str(fd, k).replace(",", ".");
  if (!raw) return null;
  const n = Number(raw);
  return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
};
const pick = (v: string, allowed: Record<string, string>, fallback: string) => (v in allowed ? v : fallback);
const csv = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

// ---------------- Auth ----------------
export async function register(_: unknown, fd: FormData) {
  const email = str(fd, "email").toLowerCase();
  const name = str(fd, "name", 80);
  const password = String(fd.get("password") ?? "");
  if (!email.includes("@") || !name || password.length < 8) {
    return { error: "Bitte Name, gültige E-Mail und ein Passwort mit mind. 8 Zeichen angeben." };
  }
  const db = getDb();
  if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) {
    return { error: "Diese E-Mail ist bereits registriert." };
  }
  const hasAdmin = db.prepare("SELECT 1 FROM users WHERE is_admin = 1").get();
  const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase();
  const isAdmin = adminEmail ? email === adminEmail : !hasAdmin;
  const info = db
    .prepare("INSERT INTO users (email, name, password_hash, is_admin) VALUES (?, ?, ?, ?)")
    .run(email, name, hashPassword(password), isAdmin ? 1 : 0);
  await createSession(Number(info.lastInsertRowid));
  redirect(safeNext(fd));
}

export async function login(_: unknown, fd: FormData) {
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const user = getDb().prepare("SELECT id, password_hash FROM users WHERE email = ?").get(email) as
    | { id: number; password_hash: string }
    | undefined;
  if (!user || !verifyPassword(password, user.password_hash)) {
    return { error: "E-Mail oder Passwort ist falsch." };
  }
  await createSession(user.id);
  redirect(safeNext(fd));
}

/** Nur interne Pfade als Rücksprungziel zulassen (kein Open Redirect). */
function safeNext(fd: FormData): string {
  const next = str(fd, "next", 2000);
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/dashboard";
}

export async function logout() {
  await destroySession();
  redirect("/");
}

// ---------------- Beschenkte ----------------
export async function saveRecipient(fd: FormData) {
  const user = await requireUser();
  const id = Number(fd.get("id") || 0);
  const data = {
    name: str(fd, "name", 80),
    birthdate: str(fd, "birthdate", 10) || null,
    gender: pick(str(fd, "gender"), GENDERS, "none"),
    interests: str(fd, "interests", 1000),
    avoid: str(fd, "avoid", 1000),
    owned: str(fd, "owned", 2000),
    sizes: str(fd, "sizes", 200),
  };
  if (!data.name) return;
  const db = getDb();
  if (id && getRecipient(id, user.id)) {
    db.prepare(
      `UPDATE recipients SET name=@name, birthdate=@birthdate, gender=@gender, interests=@interests,
       avoid=@avoid, owned=@owned, sizes=@sizes WHERE id=@id`,
    ).run({ ...data, id });
  } else {
    db.prepare(
      `INSERT INTO recipients (user_id, name, birthdate, gender, interests, avoid, owned, sizes)
       VALUES (@user_id, @name, @birthdate, @gender, @interests, @avoid, @owned, @sizes)`,
    ).run({ ...data, user_id: user.id });
  }
  redirect("/dashboard");
}

export async function deleteRecipient(fd: FormData) {
  const user = await requireUser();
  getDb().prepare("DELETE FROM recipients WHERE id = ? AND user_id = ?").run(Number(fd.get("id")), user.id);
  redirect("/dashboard");
}

// ---------------- Listen ----------------
function listData(fd: FormData) {
  return {
    title: str(fd, "title", 120),
    occasion: pick(str(fd, "occasion"), OCCASIONS, "birthday"),
    event_date: str(fd, "event_date", 10) || null,
    description: str(fd, "description", 2000),
    reveal_mode: pick(str(fd, "reveal_mode"), REVEAL_MODES, "status"),
    budget_min: num(fd, "budget_min"),
    budget_max: num(fd, "budget_max"),
    shop_name: str(fd, "shop_name", 120),
    shop_address: str(fd, "shop_address", 240),
    payment_hint: str(fd, "payment_hint", 240),
    recipient_id: Number(fd.get("recipient_id") || 0) || null,
  };
}

export async function createList(fd: FormData) {
  const user = await requireUser();
  const data = listData(fd);
  if (!data.title) return;
  if (data.recipient_id && !getRecipient(data.recipient_id, user.id)) data.recipient_id = null;
  const info = getDb()
    .prepare(
      `INSERT INTO lists (user_id, recipient_id, title, occasion, event_date, description, share_token,
        reveal_mode, budget_min, budget_max, shop_name, shop_address, payment_hint)
       VALUES (@user_id, @recipient_id, @title, @occasion, @event_date, @description, @share_token,
        @reveal_mode, @budget_min, @budget_max, @shop_name, @shop_address, @payment_hint)`,
    )
    .run({ ...data, user_id: user.id, share_token: randomToken(9) });
  redirect(`/lists/${info.lastInsertRowid}`);
}

export async function updateList(fd: FormData) {
  const user = await requireUser();
  const id = Number(fd.get("id"));
  if (!getList(id, user.id)) return;
  const data = listData(fd);
  if (data.recipient_id && !getRecipient(data.recipient_id, user.id)) data.recipient_id = null;
  getDb()
    .prepare(
      `UPDATE lists SET recipient_id=@recipient_id, title=@title, occasion=@occasion, event_date=@event_date,
       description=@description, reveal_mode=@reveal_mode, budget_min=@budget_min, budget_max=@budget_max,
       shop_name=@shop_name, shop_address=@shop_address, payment_hint=@payment_hint WHERE id=@id`,
    )
    .run({ ...data, id });
  redirect(`/lists/${id}`);
}

export async function archiveList(fd: FormData) {
  const user = await requireUser();
  const id = Number(fd.get("id"));
  const archived = fd.get("archived") === "1" ? 1 : 0;
  getDb().prepare("UPDATE lists SET archived = ? WHERE id = ? AND user_id = ?").run(archived, id, user.id);
  revalidatePath(`/lists/${id}`);
  revalidatePath("/dashboard");
}

export async function deleteList(fd: FormData) {
  const user = await requireUser();
  getDb().prepare("DELETE FROM lists WHERE id = ? AND user_id = ?").run(Number(fd.get("id")), user.id);
  redirect("/dashboard");
}

export async function regenerateShareLink(fd: FormData) {
  const user = await requireUser();
  const id = Number(fd.get("id"));
  getDb().prepare("UPDATE lists SET share_token = ? WHERE id = ? AND user_id = ?").run(randomToken(9), id, user.id);
  revalidatePath(`/lists/${id}`);
}

/** Offene Wünsche in eine andere Liste übernehmen (z.B. Geburtstag → Weihnachten). */
export async function copyOpenItems(fd: FormData) {
  const user = await requireUser();
  const from = Number(fd.get("id"));
  const to = Number(fd.get("target_id"));
  if (!getList(from, user.id) || !getList(to, user.id)) return;
  const open = getItemsWithStatus(from).filter((i) => !isItemTaken(i) && i.reservations.length === 0);
  const ins = getDb().prepare(
    `INSERT INTO items (list_id, title, description, url, image_url, price, quantity, priority, source, is_group_gift)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const i of open) {
    ins.run(to, i.title, i.description, i.url, i.image_url, i.price, i.quantity, i.priority, i.source, i.is_group_gift);
  }
  redirect(`/lists/${to}`);
}

/** Erhaltene Geschenke in "Hat schon" des Kindes übernehmen → KI schlägt sie nie wieder vor. */
export async function markReceivedAsOwned(fd: FormData) {
  const user = await requireUser();
  const list = getList(Number(fd.get("id")), user.id);
  if (!list?.recipient_id) return;
  const rec = getRecipient(list.recipient_id, user.id);
  if (!rec) return;
  const received = getItemsWithStatus(list.id)
    .filter((i) => i.reservations.length > 0)
    .map((i) => i.title);
  const owned = Array.from(new Set([...csv(rec.owned), ...received])).join(", ");
  getDb().prepare("UPDATE recipients SET owned = ? WHERE id = ?").run(owned, rec.id);
  revalidatePath(`/lists/${list.id}`);
}

export async function toggleThanked(fd: FormData) {
  const user = await requireUser();
  const resId = Number(fd.get("reservation_id"));
  getDb()
    .prepare(
      `UPDATE reservations SET thanked = 1 - thanked WHERE id = ? AND item_id IN
       (SELECT i.id FROM items i JOIN lists l ON l.id = i.list_id WHERE l.user_id = ?)`,
    )
    .run(resId, user.id);
  revalidatePath(`/lists/${fd.get("list_id")}`);
}

// ---------------- Wünsche ----------------
export async function addItem(fd: FormData) {
  const user = await requireUser();
  const listId = Number(fd.get("list_id"));
  if (!getList(listId, user.id)) return;
  const rawSource = str(fd, "source");
  const source = ["store", "ai", "photo"].includes(rawSource) ? rawSource : "link";
  let url = str(fd, "url", 2000) || null;
  if (url && !isSafeHttpUrl(url)) url = null;

  let title = str(fd, "title", 160);
  let price = num(fd, "price");
  let image = str(fd, "image_url", 2000) || null;
  let description = str(fd, "description", 1000);

  if (url && source === "link" && !fd.get("skip_meta") && (!title || price == null || !image)) {
    const meta = await fetchProductMeta(url);
    title ||= meta.title ?? "";
    price ??= meta.price ?? null;
    image ||= meta.image && isSafeHttpUrl(meta.image) ? meta.image : null;
    description ||= meta.description?.slice(0, 300) ?? "";
  }
  if (!title) title = url ? new URL(url).hostname.replace(/^www\./, "") : "Wunsch";
  if (image && !isSafeHttpUrl(image) && !UPLOAD_PATH_RE.test(image)) image = null;

  const quantity = Math.max(1, Math.min(20, Number(fd.get("quantity") || 1)));
  const priority = [1, 2, 3].includes(Number(fd.get("priority"))) ? Number(fd.get("priority")) : 2;
  getDb()
    .prepare(
      `INSERT INTO items (list_id, title, description, url, image_url, price, quantity, priority, source, is_group_gift)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(listId, title, description, url, image, price, quantity, priority, source, fd.get("is_group_gift") ? 1 : 0);
  revalidatePath(`/lists/${listId}`);
  revalidatePath(`/lists/${listId}/ideas`);
}

export async function updateItem(fd: FormData) {
  const user = await requireUser();
  const id = Number(fd.get("id"));
  const listId = Number(fd.get("list_id"));
  const list = getList(listId, user.id);
  if (!list) return;
  const db = getDb();
  const old = db.prepare("SELECT * FROM items WHERE id = ? AND list_id = ?").get(id, listId) as Item | undefined;
  if (!old) return;
  const rawUrl = str(fd, "url", 2000);
  const url = rawUrl && isSafeHttpUrl(rawUrl) ? rawUrl : null;
  let price = num(fd, "price");
  let image = old.image_url;
  // Neuer Link → Bild (und fehlenden Preis) neu laden
  if (url && url !== old.url) {
    const meta = await fetchProductMeta(url);
    image = meta.image && isSafeHttpUrl(meta.image) ? meta.image : null;
    price ??= meta.price ?? null;
  }
  if (!url && old.url) image = old.source === "photo" ? old.image_url : null;
  const source = fd.get("is_store") ? "store" : old.source === "store" ? "link" : old.source;
  db.prepare(
    `UPDATE items SET title=?, description=?, url=?, image_url=?, price=?, quantity=?, priority=?, is_group_gift=?, source=?
     WHERE id=? AND list_id=?`,
  ).run(
    str(fd, "title", 160) || "Wunsch",
    str(fd, "description", 1000),
    url,
    image,
    price,
    Math.max(1, Math.min(20, Number(fd.get("quantity") || 1))),
    [1, 2, 3].includes(Number(fd.get("priority"))) ? Number(fd.get("priority")) : 2,
    fd.get("is_group_gift") ? 1 : 0,
    source,
    id,
    listId,
  );
  revalidatePath(`/lists/${listId}`);
  revalidatePath(`/k/${list.share_token}`);
}

export async function deleteItem(fd: FormData) {
  const user = await requireUser();
  const listId = Number(fd.get("list_id"));
  if (!getList(listId, user.id)) return;
  getDb().prepare("DELETE FROM items WHERE id = ? AND list_id = ?").run(Number(fd.get("id")), listId);
  revalidatePath(`/lists/${listId}`);
}

/** Aus dem „Teilen“-Menü einer anderen App: Wunsch anlegen und zur Liste springen. */
export async function addSharedItem(fd: FormData) {
  await addItem(fd);
  redirect(`/lists/${Number(fd.get("list_id"))}`);
}

// ---------------- Wunsch per Foto ----------------
export type PhotoState = {
  image?: string;
  product?: RecognizedProduct & { url: string | null };
  error?: string;
};

/** Foto hochladen → speichern → Produkt per KI erkennen. Das Anlegen bestätigt der Nutzer danach. */
export async function recognizePhoto(_: unknown, fd: FormData): Promise<PhotoState> {
  const user = await requireUser();
  if (!getList(Number(fd.get("list_id")), user.id)) return { error: "Liste nicht gefunden." };
  const file = fd.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Bitte ein Foto auswählen." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Das Foto ist zu groß (max. 5 MB)." };
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniffImage(buf);
  if (!kind) return { error: "Bitte ein JPG-, PNG- oder WebP-Foto verwenden." };
  const image = saveUpload(buf, kind.ext);
  const result = await recognizeProduct(buf, kind.mime);
  if (!result.ok) return { image, error: result.error };
  const url = buildSearchUrl(result.product.search_query, getActiveProviders());
  return { image, product: { ...result.product, url } };
}

// ---------------- KI-Vorschläge ----------------
export async function generateIdeas(_: unknown, fd: FormData): Promise<IdeasState> {
  const user = await requireUser();
  const list = getList(Number(fd.get("list_id")), user.id);
  if (!list) return { ideas: [], source: "catalog", error: "Liste nicht gefunden." };
  const rec = list.recipient_id ? getRecipient(list.recipient_id, user.id) : undefined;

  // Formular-Werte erlauben ad-hoc-Eingrenzung, ohne das Profil zu ändern.
  const age = num(fd, "age") ?? recipientAge(rec);
  const result = await suggestGifts({
    age: age != null ? Math.round(age) : null,
    gender: pick(str(fd, "gender") || rec?.gender || "none", GENDERS, "none"),
    interests: csv(str(fd, "interests", 1000) || rec?.interests || ""),
    avoid: csv(str(fd, "avoid", 1000) || rec?.avoid || ""),
    owned: csv(rec?.owned ?? ""),
    sizes: rec?.sizes ?? "",
    occasion: list.occasion,
    budgetMin: num(fd, "budget_min") ?? list.budget_min,
    budgetMax: num(fd, "budget_max") ?? list.budget_max,
    existingItems: getItemsWithStatus(list.id).map((i) => i.title),
    extraWish: str(fd, "extra", 300) || undefined,
  });
  const providers = getActiveProviders();
  return { ...result, ideas: result.ideas.map((i) => ({ ...i, url: buildSearchUrl(i.search_query, providers) })) };
}

// ---------------- Gäste (ohne Account) ----------------
async function rememberGuestToken(listToken: string, resToken: string) {
  const jar = await cookies();
  const key = `wb_g_${listToken}`;
  const existing = (jar.get(key)?.value ?? "").split(".").filter(Boolean);
  jar.set(key, [...existing, resToken].slice(-30).join("."), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}

export async function reserveItem(_: unknown, fd: FormData) {
  const listToken = str(fd, "list_token", 40);
  const list = getListByToken(listToken);
  if (!list) return { error: "Diese Liste existiert nicht mehr." };
  const itemId = Number(fd.get("item_id"));
  const guestName = str(fd, "guest_name", 80);
  if (!guestName) return { error: "Bitte gib deinen Namen an (z.B. „Mia & Mama Sarah“)." };
  const email = str(fd, "guest_email", 200) || null;
  const message = str(fd, "message", 300);

  const db = getDb();
  const tx = db.transaction(() => {
    const item = getItemsWithStatus(list.id).find((i) => i.id === itemId);
    if (!item) return { error: "Wunsch nicht gefunden." };
    let kind: "reserve" | "pledge" = "reserve";
    let amount: number | null = null;
    if (item.is_group_gift) {
      kind = "pledge";
      amount = num(fd, "amount");
      if (!amount || amount <= 0) return { error: "Bitte einen Betrag angeben." };
      if (item.price != null && item.pledged_sum >= item.price) return { error: "Dieses Gruppengeschenk ist schon voll finanziert." };
    } else if (isItemTaken(item)) {
      return { error: "Schon vergeben – da war jemand schneller. Schau dir die anderen Wünsche an!" };
    }
    const token = randomToken(12);
    db.prepare(
      `INSERT INTO reservations (item_id, kind, guest_name, guest_email, amount, message, token)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(item.id, kind, guestName, email, amount, message, token);
    return { ok: true as const, token };
  });
  const result = tx();
  if ("token" in result && result.token) {
    await rememberGuestToken(listToken, result.token);
    (await cookies()).set("wb_guest_name", guestName, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365, path: "/" });
    if (email) await sendReservationMail(result.token);
    revalidatePath(`/k/${listToken}`);
    return { ok: true, token: result.token };
  }
  return result;
}

async function sendReservationMail(token: string) {
  const ctx = getReservationByToken(token);
  if (!ctx?.reservation.guest_email) return;
  const { reservation: r, item, list } = ctx;
  const manage = `${appUrl()}/r/${r.token}`;
  const what = r.kind === "pledge" ? `deine Zusage über ${r.amount?.toFixed(2)} € für „${item.title}“` : `„${item.title}“`;
  await sendMail(
    r.guest_email!,
    `Reserviert: ${item.title} – ${list.title}`,
    `Hallo ${r.guest_name},\n\ndanke! ${what} ist für „${list.title}“${list.event_date ? ` am ${dateDe(list.event_date)}` : ""} eingetragen.\n\n` +
      `Hier kannst du das Geschenk kaufen, als „gekauft“ markieren, einen Kalendereintrag speichern oder die Reservierung aufheben:\n${manage}\n\n` +
      `Wir erinnern dich kurz vor der Feier, falls du es noch nicht als gekauft markiert hast.\n\nDein Wishboxx-Team`,
  );
}

/** Gast markiert „gekauft“ – stoppt Erinnerungen. Funktioniert per Token (E-Mail-Link oder Cookie). */
export async function togglePurchased(fd: FormData) {
  const token = str(fd, "token", 40);
  getDb().prepare("UPDATE reservations SET purchased = 1 - purchased WHERE token = ?").run(token);
  const ctx = getReservationByToken(token);
  if (ctx) revalidatePath(`/k/${ctx.list.share_token}`);
  revalidatePath(`/r/${token}`);
}

export async function cancelReservationByToken(fd: FormData) {
  const token = str(fd, "token", 40);
  const ctx = getReservationByToken(token);
  getDb().prepare("DELETE FROM reservations WHERE token = ?").run(token);
  redirect(ctx ? `/k/${ctx.list.share_token}` : "/");
}

export async function cancelReservation(fd: FormData) {
  const listToken = str(fd, "list_token", 40);
  const token = str(fd, "token", 40);
  getDb().prepare("DELETE FROM reservations WHERE token = ?").run(token);
  revalidatePath(`/k/${listToken}`);
}

// ---------------- Admin ----------------
export async function saveProvider(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id") || 0);
  const data = {
    name: str(fd, "name", 80),
    domains: str(fd, "domains", 500),
    mode: str(fd, "mode") === "template" ? "template" : "param",
    param_name: str(fd, "param_name", 60),
    param_value: str(fd, "param_value", 200),
    link_template: str(fd, "link_template", 1000),
    search_url_template: str(fd, "search_url_template", 1000),
    use_for_suggestions: fd.get("use_for_suggestions") ? 1 : 0,
    active: fd.get("active") ? 1 : 0,
    priority: Number(fd.get("priority") || 100),
  };
  if (!data.name || !data.domains) return;
  const db = getDb();
  if (id) {
    db.prepare(
      `UPDATE affiliate_providers SET name=@name, domains=@domains, mode=@mode, param_name=@param_name,
       param_value=@param_value, link_template=@link_template, search_url_template=@search_url_template,
       use_for_suggestions=@use_for_suggestions, active=@active, priority=@priority WHERE id=@id`,
    ).run({ ...data, id });
  } else {
    db.prepare(
      `INSERT INTO affiliate_providers (name, domains, mode, param_name, param_value, link_template,
       search_url_template, use_for_suggestions, active, priority)
       VALUES (@name, @domains, @mode, @param_name, @param_value, @link_template, @search_url_template,
       @use_for_suggestions, @active, @priority)`,
    ).run(data);
  }
  revalidatePath("/admin");
}

export async function deleteProvider(fd: FormData) {
  await requireAdmin();
  getDb().prepare("DELETE FROM affiliate_providers WHERE id = ?").run(Number(fd.get("id")));
  revalidatePath("/admin");
}

// ---------------- Login per E-Mail-Link ----------------
export type LinkState = { sent?: boolean; email?: string; devLink?: string; error?: string };

/** Schickt einen Einmal-Login-Link. Ist der Nutzer gerade Gast, wird seine Boxx beim Einlösen übernommen. */
export async function requestLoginLink(_: unknown, fd: FormData): Promise<LinkState> {
  const email = str(fd, "email", 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Bitte eine gültige E-Mail-Adresse eingeben." };
  const current = await getCurrentUser();
  const token = createLoginToken({
    email,
    name: str(fd, "name", 80),
    guestUserId: current?.is_guest ? current.id : null,
    next: safeNext(fd),
  });
  const link = `${appUrl()}/auth/verify?token=${token}`;
  if (!mailConfigured() && (process.env.NODE_ENV !== "production" || process.env.SHOW_LOGIN_LINKS === "1")) {
    return { sent: true, email, devLink: link }; // Entwicklung: Link direkt anzeigen
  }
  const ok = await sendMail(
    email,
    "Dein Anmelde-Link für Wishboxx",
    `Hallo!\n\nTippe auf diesen Link, um dich bei Wishboxx anzumelden (15 Minuten gültig):\n${link}\n\n` +
      `Du hast keinen Link angefordert? Dann ignoriere diese E-Mail einfach.\n\nDein Wishboxx-Team`,
  );
  if (!ok || !mailConfigured()) return { error: "Die E-Mail konnte gerade nicht verschickt werden. Bitte später erneut versuchen." };
  return { sent: true, email };
}

export async function confirmLogin(fd: FormData) {
  const next = await redeemLoginToken(str(fd, "token", 100));
  redirect(next ?? "/login?abgelaufen=1");
}

// ---------------- Boxx in 60 Sekunden ----------------
const BUDGETS: Record<string, [number | null, number | null]> = {
  "10": [null, 10],
  "15": [10, 15],
  "25": [15, 25],
  "": [null, null],
};

const genitive = (name: string) => (/[sßxz]$/i.test(name) ? `${name}'` : `${name}s`);

function defaultTitle(name: string, occasion: string, age: number | null): string {
  const n = genitive(name);
  switch (occasion) {
    case "birthday": return age != null ? `${n} ${age}. Geburtstag` : `${n} Geburtstag`;
    case "christmas": return `${n} Weihnachtswünsche`;
    case "easter": return `${n} Osterwünsche`;
    case "school": return `${n} Einschulung`;
    case "communion": return `${n} großer Tag`;
    case "baby": return `Willkommen, ${name}!`;
    default: return `${n} Wünsche`;
  }
}

/** Drei Fragen → Gast-Konto, Kinderprofil, Boxx, KI füllt sie direkt mit Ideen. */
export type QuickStartState = {
  error?: string;
  needsLogin?: boolean;
  duplicate?: { id: number; title: string; date: string | null };
};

/** Ähnliche Boxx: gleiches Kind (Name), gleicher Anlass, gleiches Jahr (bzw. beide ohne Datum), nicht archiviert. */
function findSimilarBox(userId: number, childName: string, occasion: string, eventDate: string | null) {
  const rows = getDb()
    .prepare(
      `SELECT l.id, l.title, l.event_date FROM lists l JOIN recipients r ON r.id = l.recipient_id
       WHERE l.user_id = ? AND l.archived = 0 AND lower(r.name) = lower(?) AND l.occasion = ?`,
    )
    .all(userId, childName, occasion) as { id: number; title: string; event_date: string | null }[];
  const year = eventDate?.slice(0, 4) ?? null;
  return rows.find((r) => (r.event_date?.slice(0, 4) ?? null) === year || (!year && !eventIsOver({ event_date: r.event_date })));
}

export async function quickStart(_: unknown, fd: FormData): Promise<QuickStartState> {
  const name = str(fd, "name", 60);
  if (!name) return { error: "Wie heißt das Kind?" };
  const age = num(fd, "age");
  const occasion = pick(str(fd, "occasion"), OCCASIONS, "birthday");
  const eventDate = str(fd, "event_date", 10) || null;
  const interests = str(fd, "interests", 500);
  const avoid = str(fd, "avoid", 300);
  const [budgetMin, budgetMax] = BUDGETS[str(fd, "budget")] ?? [null, null];
  const current = await getCurrentUser();
  const db = getDb();
  if (current) {
    // Mehrere Boxen nur mit gesichertem Konto
    const count = (db.prepare("SELECT COUNT(*) AS c FROM lists WHERE user_id = ?").get(current.id) as { c: number }).c;
    if (current.is_guest && count > 0) return { needsLogin: true };
    // Nicht doppelt anlegen
    if (!fd.get("force")) {
      const dup = findSimilarBox(current.id, name, occasion, eventDate);
      if (dup) return { duplicate: { id: dup.id, title: dup.title, date: dup.event_date } };
    }
  }
  const user = await getOrCreateGuest(str(fd, "parent", 60));

  // Vorhandenes Kind wiederverwenden (Auswahl im Schnellstart oder gleicher Name),
  // damit „hat schon“ und Merkzettel erhalten bleiben
  const gender = pick(str(fd, "gender"), GENDERS, "none");
  let rec =
    getRecipient(Number(fd.get("recipient_id") || 0), user.id) ??
    (db.prepare("SELECT * FROM recipients WHERE user_id = ? AND lower(name) = lower(?)").get(user.id, name) as Recipient | undefined);

  // Bei Geburtstag mit Datum lässt sich der Geburtstag genau ableiten: Feier-Datum minus Alter
  let birthdate: string | null = null;
  if (occasion === "birthday" && eventDate && age != null) {
    birthdate = `${Number(eventDate.slice(0, 4)) - Math.round(age)}${eventDate.slice(4)}`;
  }
  if (rec) {
    const merged = (a: string, b: string) => Array.from(new Set([...csv(a), ...csv(b)])).join(", ");
    db.prepare(
      `UPDATE recipients SET interests = ?, avoid = ?, gender = CASE WHEN ? = 'none' THEN gender ELSE ? END,
       birthdate = COALESCE(birthdate, ?), age_hint = CASE WHEN birthdate IS NULL AND ? IS NOT NULL THEN ? ELSE age_hint END WHERE id = ?`,
    ).run(merged(rec.interests, interests), merged(rec.avoid, avoid), gender, gender, birthdate,
      age, age != null ? Math.round(age) : null, rec.id);
  } else {
    const info = db
      .prepare(`INSERT INTO recipients (user_id, name, birthdate, gender, interests, avoid, age_hint) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(user.id, name, birthdate, gender, interests, avoid, age != null && !birthdate ? Math.round(age) : null);
    rec = getRecipient(Number(info.lastInsertRowid), user.id);
  }
  rec = getRecipient(rec!.id, user.id)!;

  const turning = occasion === "birthday" && age != null ? Math.round(age) : null;
  const list = db
    .prepare(
      `INSERT INTO lists (user_id, recipient_id, title, occasion, event_date, share_token, budget_min, budget_max)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(user.id, rec.id, defaultTitle(rec.name, occasion, turning), occasion, eventDate, randomToken(9), budgetMin, budgetMax);
  const listId = Number(list.lastInsertRowid);
  await fillBox(listId, rec, { age: age != null ? Math.round(age) : recipientAge(rec), occasion, budgetMin, budgetMax });
  redirect(`/lists/${listId}?neu=1`);
}

/**
 * Füllt eine Boxx: 1. Merkzettel des Kindes, 2. übernommene Wünsche, 3. KI-Ideen.
 * Die KI kennt „hat schon“ und bevorzugt Fortsetzungen zu bereits Geschenktem.
 */
async function fillBox(
  listId: number,
  rec: Recipient,
  opts: {
    age: number | null;
    occasion: string;
    budgetMin: number | null;
    budgetMax: number | null;
    carry?: Item[];
    received?: string[];
  },
) {
  const db = getDb();
  const providers = getActiveProviders();
  let sort = 0;
  const ins = db.prepare(
    `INSERT INTO items (list_id, title, description, url, image_url, price, quantity, priority, source, is_group_gift, sort)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const memos = getMemos(rec.id);
  for (const m of memos) {
    ins.run(listId, m.title, m.from_item ? `Gemerkt nach „${m.from_item}“` : "Vom Merkzettel", m.url ?? buildSearchUrl(m.title, providers),
      null, null, 1, 1, "memo", 0, sort++);
  }
  if (memos.length) db.prepare(`UPDATE memos SET done = 1 WHERE recipient_id = ? AND done = 0`).run(rec.id);
  for (const i of opts.carry ?? []) {
    ins.run(listId, i.title, i.description, i.url, i.image_url, i.price, i.quantity, i.priority, i.source, i.is_group_gift, sort++);
  }
  const existing = [...memos.map((m) => m.title), ...(opts.carry ?? []).map((i) => i.title)];
  const count = Math.max(4, 8 - existing.length);
  const received = opts.received ?? [];
  const ideas = await suggestGifts(
    {
      age: opts.age,
      gender: rec.gender,
      interests: csv(rec.interests),
      avoid: csv(rec.avoid),
      owned: csv(rec.owned),
      sizes: rec.sizes,
      occasion: opts.occasion,
      budgetMin: opts.budgetMin,
      budgetMax: opts.budgetMax,
      existingItems: existing,
      extraWish: received.length
        ? `Letztes Mal geschenkt: ${received.join("; ")}. Schlage bevorzugt passende Fortsetzungen oder Erweiterungen vor (z.B. nächster Band einer Buchreihe, Erweiterungsset), aber nichts, was schon vorhanden ist.`
        : undefined,
    },
    count,
  );
  for (const i of ideas.ideas) {
    ins.run(listId, i.title, `${i.description} – ${i.reason}`, buildSearchUrl(i.search_query, providers), null,
      i.price_estimate || null, 1, 2, "ai", 0, sort++);
  }
}

// ---------------- Merkzettel ----------------
export async function addMemo(fd: FormData) {
  const user = await requireUser();
  const rec = getRecipient(Number(fd.get("recipient_id")), user.id);
  const title = str(fd, "title", 160);
  if (!rec || !title) return;
  const url = str(fd, "url", 2000);
  getDb()
    .prepare("INSERT INTO memos (recipient_id, title, url, from_item) VALUES (?, ?, ?, ?)")
    .run(rec.id, title, url && isSafeHttpUrl(url) ? url : null, str(fd, "from_item", 160));
  revalidatePath(`/recipients/${rec.id}`);
  revalidatePath("/dashboard");
  const back = str(fd, "back", 200);
  if (back.startsWith("/")) revalidatePath(back);
}

export async function deleteMemo(fd: FormData) {
  const user = await requireUser();
  getDb()
    .prepare("DELETE FROM memos WHERE id = ? AND recipient_id IN (SELECT id FROM recipients WHERE user_id = ?)")
    .run(Number(fd.get("id")), user.id);
  revalidatePath(`/recipients/${fd.get("recipient_id")}`);
  revalidatePath("/dashboard");
}

// ---------------- Nächstes Jahr wieder packen ----------------
export async function packAgain(fd: FormData) {
  const user = await requireUser();
  const old = getList(Number(fd.get("id")), user.id);
  if (!old) return;
  if (user.is_guest) redirect(`/lists/${old.id}?sichern=1`); // weitere Boxen nur mit Konto
  // Gibt es die Boxx fürs Folgejahr schon? Dann dorthin statt doppelt anlegen
  const nextDate = plusOneYear(old.event_date);
  if (nextDate) {
    const exists = getDb()
      .prepare("SELECT id FROM lists WHERE user_id = ? AND archived = 0 AND occasion = ? AND recipient_id IS ? AND substr(event_date, 1, 4) = ?")
      .get(user.id, old.occasion, old.recipient_id, nextDate.slice(0, 4)) as { id: number } | undefined;
    if (exists) redirect(`/lists/${exists.id}?schon=1`);
  }
  const rec = old.recipient_id ? getRecipient(old.recipient_id, user.id) : undefined;
  const items = getItemsWithStatus(old.id);
  const received = items.filter((i) => i.reservations.length > 0).map((i) => i.title);
  const carry = items.filter((i) => i.reservations.length === 0);
  const db = getDb();

  // Erhaltenes ins „hat schon“ des Kindes übernehmen
  if (rec && received.length) {
    const owned = Array.from(new Set([...csv(rec.owned), ...received])).join(", ");
    db.prepare("UPDATE recipients SET owned = ? WHERE id = ?").run(owned, rec.id);
  }
  const info = db
    .prepare(
      `INSERT INTO lists (user_id, recipient_id, title, occasion, event_date, description, share_token, reveal_mode,
        budget_min, budget_max, shop_name, shop_address, payment_hint)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(user.id, old.recipient_id, nextYearTitle(old.title), old.occasion, plusOneYear(old.event_date), "", randomToken(9),
      old.reveal_mode, old.budget_min, old.budget_max, old.shop_name, old.shop_address, old.payment_hint);
  const listId = Number(info.lastInsertRowid);
  db.prepare("UPDATE lists SET archived = 1 WHERE id = ?").run(old.id);

  if (rec) {
    const fresh = getRecipient(rec.id, user.id)!;
    const age = recipientAge(fresh);
    await fillBox(listId, fresh, {
      age: age != null && old.occasion === "birthday" ? age + 1 : age,
      occasion: old.occasion,
      budgetMin: old.budget_min,
      budgetMax: old.budget_max,
      carry,
      received,
    });
  } else {
    const ins = db.prepare(
      `INSERT INTO items (list_id, title, description, url, image_url, price, quantity, priority, source, is_group_gift, sort)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    carry.forEach((i, n) => ins.run(listId, i.title, i.description, i.url, i.image_url, i.price, i.quantity, i.priority, i.source, i.is_group_gift, n));
  }
  redirect(`/lists/${listId}?neu=1`);
}

// ---------------- Ein Eingabefeld: Link oder Stichwort ----------------
export async function smartAdd(fd: FormData) {
  const user = await requireUser();
  const listId = Number(fd.get("list_id"));
  if (!getList(listId, user.id)) return;
  const q = str(fd, "q", 2000);
  if (!q) return;
  const urlInText = q.match(/https?:\/\/\S+/)?.[0];
  const out = new FormData();
  for (const [k, v] of fd.entries()) if (k !== "q") out.set(k, v);
  if (urlInText) {
    out.set("url", urlInText);
    const rest = q.replace(urlInText, "").trim();
    if (rest && !str(fd, "title")) out.set("title", rest.slice(0, 160));
  } else {
    // Stichwort → Wunsch mit Such-Link beim bevorzugten Shop (Affiliate)
    if (!str(fd, "title")) out.set("title", q.slice(0, 160));
    const search = buildSearchUrl(q, getActiveProviders());
    if (search && str(fd, "source") !== "store") {
      out.set("url", search);
      out.set("skip_meta", "1"); // Suchseite liefert keine Produktdaten
    }
  }
  await addItem(out);
}

/** Listen-Inhaberin gibt eine Reservierung wieder frei (z.B. versehentlich oder blockiert). */
export async function releaseReservation(fd: FormData) {
  const user = await requireUser();
  const listId = Number(fd.get("list_id"));
  const list = getList(listId, user.id);
  if (!list) return;
  if (list.reveal_mode === "surprise" && !eventIsOver(list)) return; // im Überraschungsmodus nicht sichtbar
  getDb()
    .prepare("DELETE FROM reservations WHERE id = ? AND item_id IN (SELECT id FROM items WHERE list_id = ?)")
    .run(Number(fd.get("reservation_id")), listId);
  revalidatePath(`/lists/${listId}`);
  revalidatePath(`/k/${list.share_token}`);
}

// ---------------- Admin: Partner aus Beispiel-Link ----------------
export type ProviderSuggestion = {
  draft?: {
    name: string; domains: string; mode: string; param_name: string; param_value: string;
    link_template: string; search_url_template: string; active: number; use_for_suggestions: number; priority: number;
  };
  source?: "erkannt" | "ki";
  note?: string;
  error?: string;
};

/** Erkennt Partner-Einstellungen aus einem Beispiel-Affiliate-Link; unbekannte Formate wertet die KI aus. */
export async function suggestProvider(_: unknown, fd: FormData): Promise<ProviderSuggestion> {
  await requireAdmin();
  const input = str(fd, "example", 4000);
  const domainHint = str(fd, "domain", 200);
  if (!input) return { error: "Bitte einen Beispiel-Link einfügen." };
  const base = { active: 1, use_for_suggestions: 0, priority: 50 };
  const link = input.match(/https?:\/\/\S+/)?.[0];
  const found = link ? detectProviderFromExample(link) : null;
  if (found) {
    return {
      source: "erkannt",
      note: found.mode === "template"
        ? `${found.network}-Deeplink erkannt. Die IDs stammen aus deinem Link – bitte kurz prüfen und speichern.`
        : `Partner-ID „${found.param_value}“ im Parameter „${found.param_name}“ erkannt.`,
      draft: { ...base, ...found, search_url_template: "" },
    };
  }
  const ai = await draftProviderWithAi(input, domainHint);
  if ("error" in ai) return { error: ai.error };
  // Sicherheitsnetz: nur Werte übernehmen, die wirklich im eingefügten Text stehen
  const inInput = (v: string) => !v || input.includes(v) || input.includes(encodeURIComponent(v));
  if (!inInput(ai.param_value)) return { error: "Die KI hat eine ID vorgeschlagen, die nicht in deinem Link steht – bitte von Hand ausfüllen." };
  return {
    source: "ki",
    note: ai.note || "Von der KI vorgeschlagen – bitte prüfen, vor allem den Such-Link.",
    draft: { ...base, name: ai.name, domains: ai.domains, mode: ai.mode, param_name: ai.param_name, param_value: ai.param_value,
      link_template: ai.link_template, search_url_template: ai.search_url_template },
  };
}

// ---------------- KI-Vorschläge direkt beim Hinzufügen ----------------
export type QueryIdeasState = { q?: string; ideas?: IdeaWithLink[]; note?: string; error?: string };

/** Stichwort oder Frage („etwas mit Pferden für 15 €“) → 4 passende Vorschläge für genau diese Boxx. */
export async function ideasForQuery(_: unknown, fd: FormData): Promise<QueryIdeasState> {
  const user = await requireUser();
  const list = getList(Number(fd.get("list_id")), user.id);
  if (!list) return { error: "Boxx nicht gefunden." };
  const q = str(fd, "q", 300);
  if (!q) return { error: "Tippe ein Stichwort oder eine Frage ein, z.B. „etwas mit Pferden“." };
  const rec = list.recipient_id ? getRecipient(list.recipient_id, user.id) : undefined;
  const age = recipientAge(rec);
  const result = await suggestGifts(
    {
      age: age != null && list.occasion === "birthday" && list.event_date && !eventIsOver(list) ? age + 1 : age,
      gender: rec?.gender ?? "none",
      interests: [q],
      avoid: csv(rec?.avoid ?? ""),
      owned: csv(rec?.owned ?? ""),
      sizes: rec?.sizes ?? "",
      occasion: list.occasion,
      budgetMin: list.budget_min,
      budgetMax: list.budget_max,
      existingItems: getItemsWithStatus(list.id).map((i) => i.title),
      extraWish: `Die Eltern suchen gezielt: „${q}“. Schlage 4 konkrete, unterschiedliche Produkte genau dazu vor.${rec?.interests ? ` Weitere Interessen des Kindes: ${rec.interests}.` : ""}`,
      strict: true,
    },
    4,
  );
  const providers = getActiveProviders();
  return {
    q,
    note: result.source === "catalog" ? result.note : undefined,
    ideas: result.ideas.map((i) => ({ ...i, url: buildSearchUrl(i.search_query, providers) })),
  };
}
