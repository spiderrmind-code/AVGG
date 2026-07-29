import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getCjProductDetail, listCjProducts } from "@/lib/cj/client";
import { mapCjProduct, upsertCjProducts } from "@/lib/cj/catalog";
import { getDb } from "@/lib/mongo";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });
  try {
    const body: unknown = await request.json(); const record = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const limit = Math.min(Math.max(Number(record.limit) || 1, 1), 10); const dryRun = record.dryRun === true; const salePrice = typeof record.salePrice === "number" && Number.isFinite(record.salePrice) ? record.salePrice : undefined;
    const ids = Array.isArray(record.cjIds) ? record.cjIds.filter((id): id is string => typeof id === "string").slice(0, limit) : [];
    const rawProducts = ids.length > 0
      ? await Promise.all(ids.map(async (id) => { const response = await getCjProductDetail(id); return response && typeof response === "object" && "data" in response && response.data && typeof response.data === "object" ? response.data as Record<string, unknown> : response as Record<string, unknown>; }))
      : await listCjProducts(1, limit);
    const products = rawProducts.map(mapCjProduct).filter((product): product is NonNullable<typeof product> => product !== null);
    const report = await upsertCjProducts((await getDb()).collection("products"), products, { dryRun, salePrice });
    return NextResponse.json({ success: report.failed === 0, dryRun, received: rawProducts.length, mapped: products.length, ...report });
  } catch (error) {
    const status = error && typeof error === "object" && "status" in error && typeof error.status === "number" ? error.status : 502;
    console.error("CJ sync failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ success: false, message: "No se pudo sincronizar CJ" }, { status });
  }
}
