import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getDb } from "@/lib/mongo";
import { getInventoryStatus } from "@/lib/inventory";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || (session.user as any).role !== "admin") {
    return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const db = await getDb();
    const [products, orders, suppliers] = await Promise.all([
      db.collection("products").find({}).toArray(),
      db.collection("orders").find({}).toArray(),
      db.collection("suppliers").find({}).toArray(),
    ]);

    const totalSales = orders.reduce((sum, order: any) => sum + Number(order.total ?? 0), 0);
    const estimatedProfit = orders.reduce((sum, order: any) => {
      const internalItems = Array.isArray(order.items) ? order.items : [];
      const costSum = internalItems.reduce((costTotal: number, item: any) => {
        const internal = item._internal ?? {};
        return costTotal + Number(internal.costPrice ?? 0) * Number(item.quantity ?? 1);
      }, 0);
      return sum + Math.max(0, Number(order.total ?? 0) - costSum);
    }, 0);

    const activeProducts = products.filter((product: any) => product.active !== false).length;
    const activeSuppliers = suppliers.filter((supplier: any) => String(supplier.status ?? "active").toLowerCase() === "active").length;
    const stockAlerts = products.filter((product: any) => getInventoryStatus(product.supplierStock ?? product.stock) !== "available").length;

    return NextResponse.json({
      success: true,
      stats: {
        totalSales,
        orderCount: orders.length,
        estimatedProfit,
        activeProducts,
        activeSuppliers,
        stockAlerts,
      },
    });
  } catch (error) {
    console.error("ERROR ADMIN DASHBOARD:", error);
    return NextResponse.json({ success: false, message: "Error cargando dashboard" }, { status: 500 });
  }
}
