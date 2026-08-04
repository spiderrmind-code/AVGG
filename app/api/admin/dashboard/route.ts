import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getDb } from "@/lib/mongo";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 });
  return null;
}

function startOfArgentinaDay(offsetDays = 0) {
  const now = new Date();
  const argentina = new Date(now.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
  argentina.setHours(0, 0, 0, 0);
  argentina.setDate(argentina.getDate() - offsetDays);
  const offset = -3 * 60 * 60 * 1000;
  return new Date(argentina.getTime() - offset);
}

async function salesSince(db: Awaited<ReturnType<typeof getDb>>, from?: Date) {
  const match = { paymentStatus: "approved", ...(from ? { createdAt: { $gte: from } } : {}) };
  const rows = await db.collection("orders").aggregate<{ total: number; average: number }>([
    { $match: match },
    { $group: { _id: null, total: { $sum: { $ifNull: ["$total", 0] } }, average: { $avg: { $ifNull: ["$total", 0] } } } },
  ]).toArray();
  return rows[0] ?? { total: 0, average: 0 };
}

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const db = await getDb();
    const orders = db.collection("orders");
    const products = db.collection("products");
    const suppliers = db.collection("suppliers");
    const today = startOfArgentinaDay();
    const lastSevenDays = startOfArgentinaDay(6);
    const [allSales, todaySales, weekSales, orderCount, pendingOrders, paidOrders, fulfillmentOrders, shippedOrders, deliveredOrders, errorOrders, activeProducts, outOfStockProducts, lowStockProducts, activeSuppliers, customerCount] = await Promise.all([
      salesSince(db), salesSince(db, today), salesSince(db, lastSevenDays),
      orders.countDocuments(), orders.countDocuments({ paymentStatus: "pending" }), orders.countDocuments({ paymentStatus: "approved" }),
      orders.countDocuments({ fulfillmentStatus: { $in: ["ready", "reserved", "creating", "created", "requesting", "submitted", "processing"] } }),
      orders.countDocuments({ $or: [{ status: "shipped" }, { fulfillmentStatus: "shipped" }] }),
      orders.countDocuments({ $or: [{ status: "delivered" }, { fulfillmentStatus: "delivered" }] }),
      orders.countDocuments({ $or: [{ fulfillmentStatus: "unknown" }, { trackingStatus: "exception" }, { cjValidationStatus: "ineligible" }] }),
      products.countDocuments({ active: { $ne: false } }),
      products.countDocuments({ $or: [{ stock: false }, { stockQuantity: { $lte: 0 } }, { supplierStock: { $lte: 0 } }] }),
      products.countDocuments({ $or: [{ stockQuantity: { $gt: 0, $lte: 3 } }, { supplierStock: { $gt: 0, $lte: 3 } }] }),
      suppliers.countDocuments({ status: { $ne: "paused" } }),
      db.collection("users").countDocuments(),
    ]);

    return NextResponse.json({ success: true, stats: {
      totalSales: allSales.total, salesToday: todaySales.total, salesLast7Days: weekSales.total, averageTicket: allSales.average,
      orderCount, pendingOrders, paidOrders, fulfillmentOrders, shippedOrders, deliveredOrders, errorOrders,
      activeProducts, outOfStockProducts, lowStockProducts, activeSuppliers, customerCount,
    } });
  } catch {
    return NextResponse.json({ success: false, message: "Error cargando dashboard" }, { status: 500 });
  }
}
