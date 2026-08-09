import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getDb } from "@/lib/mongo";
import { PUBLIC_BANNERS_CACHE_TAG } from "@/lib/public-catalog-cache";

type BannerDocument = Record<string, unknown>;

function safeText(value: unknown, max: number) {
  return typeof value === "string" && value.trim().length <= max ? value.trim() : undefined;
}

function safeUrl(value: unknown) {
  const url = safeText(value, 2_000);
  if (!url) return undefined;
  try {
    const parsed = new URL(url, "https://avg-connects.local");
    return parsed.protocol === "https:" || (parsed.origin === "https://avg-connects.local" && url.startsWith("/")) ? url : undefined;
  } catch { return undefined; }
}

function normalizeBanner(row: BannerDocument) {
  const title = safeText(row.title ?? row.name, 140);
  const image = safeUrl(row.image ?? row.imageUrl);
  if (!title || !image) return null;
  return { _id: String(row._id), title, ...(safeText(row.subtitle ?? row.description, 280) ? { subtitle: safeText(row.subtitle ?? row.description, 280) } : {}), image, ...(safeUrl(row.href ?? row.link) ? { href: safeUrl(row.href ?? row.link) } : {}), ...(safeText(row.ctaText, 60) ? { ctaText: safeText(row.ctaText, 60) } : {}) };
}

const getPublicBanners = unstable_cache(async () => {
  const now = new Date();
  const db = await getDb();
  const rows = await db.collection<BannerDocument>("banners").find({ active: { $ne: false }, $and: [{ $or: [{ startsAt: { $exists: false } }, { startsAt: { $lte: now } }] }, { $or: [{ endsAt: { $exists: false } }, { endsAt: { $gte: now } }] }] }, { projection: { title: 1, name: 1, subtitle: 1, description: 1, image: 1, imageUrl: 1, href: 1, link: 1, ctaText: 1, order: 1 } }).sort({ order: 1, _id: 1 }).limit(20).toArray();
  return rows.map(normalizeBanner).filter((banner): banner is NonNullable<typeof banner> => banner !== null);
}, ["public-banners"], { revalidate: 60, tags: [PUBLIC_BANNERS_CACHE_TAG] });

export async function GET() {
  try { return NextResponse.json(await getPublicBanners()); }
  catch { return NextResponse.json({ error: "No se pudieron cargar los banners" }, { status: 503 }); }
}
