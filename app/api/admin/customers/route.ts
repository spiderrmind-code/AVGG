import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getDb } from "@/lib/mongo";

function maskEmail(value: unknown) {
  if (typeof value !== "string") return "Sin información";
  const [local, domain] = value.split("@");
  if (!local || !domain) return "Sin información";
  return `${local.slice(0, 1)}${"*".repeat(Math.max(2, local.length - 1))}@${domain}`;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const rawPage = Number(params.get("page")); const page = Number.isInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 10_000) : 1;
  const limit = Math.min(Math.max(Number(params.get("limit")) || 25, 1), 100);
  const query = params.get("q")?.trim();
  try {
    const db = await getDb();
    const filter = query ? { $or: [{ email: { $regex: query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }, { name: { $regex: query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }] } : {};
    const [users, total] = await Promise.all([db.collection("users").find(filter, { projection: { password: 0 } }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(), db.collection("users").countDocuments(filter)]);
    const customers = await Promise.all(users.map(async (user) => {
      const [orderCount, totals, last] = await Promise.all([
        db.collection("orders").countDocuments({ $or: [{ userId: String(user._id) }, { "customer.email": user.email }] }),
        db.collection("orders").aggregate<{ total: number }>([{ $match: { paymentStatus: "approved", $or: [{ userId: String(user._id) }, { "customer.email": user.email }] } }, { $group: { _id: null, total: { $sum: "$total" } } }]).toArray(),
        db.collection("orders").find({ $or: [{ userId: String(user._id) }, { "customer.email": user.email }] }, { projection: { createdAt: 1 } }).sort({ createdAt: -1 }).limit(1).toArray(),
      ]);
      return { id: String(user._id), name: typeof user.name === "string" ? user.name : "Sin información", emailMasked: maskEmail(user.email), orderCount, totalPurchased: totals[0]?.total ?? 0, lastPurchaseAt: last[0]?.createdAt ?? null, createdAt: user.createdAt ?? null };
    }));
    return NextResponse.json({ customers, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
  } catch { return NextResponse.json({ error: "CUSTOMERS_UNAVAILABLE" }, { status: 500 }); }
}
