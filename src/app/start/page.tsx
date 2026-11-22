import { QuickStart, type KnownChild } from "@/components/QuickStart";
import { getCurrentUser } from "@/lib/auth";
import { getMemoCounts, getRecipients, recipientAge } from "@/lib/repo";

export const metadata = { title: "Boxx packen – Wishboxx" };

export default async function StartPage() {
  const user = await getCurrentUser();
  let known: KnownChild[] = [];
  if (user) {
    const memos = getMemoCounts(user.id);
    known = getRecipients(user.id).map((r) => ({
      id: r.id,
      name: r.name,
      age: recipientAge(r),
      gender: r.gender,
      interests: r.interests,
      avoid: r.avoid,
      memos: memos[r.id] ?? 0,
    }));
  }
  return <QuickStart known={known} />;
}
