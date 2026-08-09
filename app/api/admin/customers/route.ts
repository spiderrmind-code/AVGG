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
  const rawPage = Number(params.get("page"));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 10_000) : 1;
  const limit = Math.min(Math.max(Number(params.get("limit")) || 25, 1), 100);
  const query = params.get("q")?.trim();
  try {
    const db = await getDb();
    const escaped = query?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const filter = escaped ? { $or: [{ email: { $regex: escaped, $options: "i" } }, { name: { $regex: escaped, $options: "i" } }] } : {};
    const [users, total] = await Promise.all([
      db.collection("users").find(filter, { projection: { password: 0 } }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      db.collection("users").countDocuments(filter),
    ]);
    const userIds = users.map((user) => String(user._id));
    const emails = users.flatMap((user) => typeof user.email === "string" ? [user.email] : []);
    const orders = userIds.length === 0 ? [] : await db.collection("orders").aggregate<{ userId?: string; customer?: { email?: string }; paymentStatus?: string; total?: number; createdAt?: Date }>([
      { $match: { $or: [{ userId: { $in: userIds } }, { "customer.email": { $in: emails } }] } },
      { $project: { userId: 1, "customer.email": 1, paymentStatus: 1, total: 1, createdAt: 1 } },
    ]).toArray();
    const summaries = new Map<string, { orderCount: number; totalPurchased: number; lastPurchaseAt: Date | null }>();
    for (const order of orders) {
      const key = typeof order.userId === "string" && userIds.includes(order.userId) ? `id:${order.userId}` : typeof order.customer?.email === "string" ? `email:${order.customer.email}` : null;
      if (!key) continue;
      const summary = summaries.get(key) ?? { orderCount: 0, totalPurchased: 0, lastPurchaseAt: null };
      summary.orderCount += 1;
      if (order.paymentStatus === "approved" && typeof order.total === "number") summary.totalPurchased += order.total;
      if (order.createdAt instanceof Date && (!summary.lastPurchaseAt || order.createdAt > summary.lastPurchaseAt)) summary.lastPurchaseAt = order.createdAt;
      summaries.set(key, summary);
    }
    const customers = users.map((user) => {
      const summary = summaries.get(`id:${String(user._id)}`) ?? (typeof user.email === "string" ? summaries.get(`email:${user.email}`) : undefined) ?? { orderCount: 0, totalPurchased: 0, lastPurchaseAt: null };
      return { id: String(user._id), name: typeof user.name === "string" ? user.name : "Sin información", emailMasked: maskEmail(user.email), ...summary, createdAt: user.createdAt ?? null };
    });
    return NextResponse.json({ customers, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
  } catch { return NextResponse.json({ error: "CUSTOMERS_UNAVAILABLE" }, { status: 500 }); }
}
