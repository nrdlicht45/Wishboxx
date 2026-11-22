/**
 * Wertet geteilte Inhalte aus anderen Apps aus. Shop-Apps schicken oft nur Text wie
 * „Schau mal, was ich bei Amazon gefunden habe: LEGO Pferdestall https://amzn.eu/d/abc“.
 */
export function parseSharedContent(input: { title?: string; text?: string; url?: string }): { url: string; title: string } {
  const text = (input.text ?? "").trim();
  const urlInText = text.match(/https?:\/\/[^\s<>"']+/)?.[0] ?? "";
  const url = (input.url ?? "").trim() || urlInText;
  let title = (input.title ?? "").trim();
  if (!title || /^https?:\/\//.test(title)) {
    title = text
      .replace(urlInText, "")
      .replace(/^.*(gefunden|entdeckt|angesehen)[^:]*:\s*/i, "")
      .replace(/^(check (this|out)|look at)[^:]*:\s*/i, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  return { url, title: title.slice(0, 160) };
}
