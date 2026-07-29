import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { listCjProducts } from "@/lib/cj/client";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return Response.json({ success: false, message: "No autorizado" }, { status: 401 });
  try {
    const products = await listCjProducts();
    const safeProducts = products.map((product) => {
      const item = product && typeof product === "object" ? product as Record<string, unknown> : {};
      return { id: String(item.id ?? item.pid ?? ""), name: typeof item.productName === "string" ? item.productName : typeof item.name === "string" ? item.name : "Producto CJ", sku: typeof item.sku === "string" ? item.sku : undefined };
    });
    return Response.json({ success: true, products: safeProducts });

  } catch (error) {
    console.error("CJ products query failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return Response.json({ success: false, message: "No se pudieron consultar productos de CJ" }, { status: 502 });
  }
}
