import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return Response.json({ success: false, message: "No autorizado" }, { status: 401 });
  try {
    if (!process.env.CJ_API_KEY) return Response.json({ success: false, message: "CJ no configurado" }, { status: 503 });
    // Obtener access token
    const authResponse = await fetch(
      "https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey: process.env.CJ_API_KEY,
        }),
      }
    );

    const authData: unknown = await authResponse.json();
    const authRecord = authData && typeof authData === "object" ? authData as { result?: boolean; data?: { accessToken?: unknown } } : null;

    if (!authResponse.ok || !authRecord?.result || typeof authRecord.data?.accessToken !== "string") {
      return Response.json({ success: false, message: "No se pudo autenticar con CJ" }, { status: 502 });
    }

    const token = authRecord.data.accessToken;

    // Pedir productos
    const productsResponse = await fetch(
      "https://developers.cjdropshipping.com/api2.0/v1/product/list",
      {
        method: "GET",
        headers: {
          "CJ-Access-Token": token,
          "Content-Type": "application/json",
        },
      }
    );

    const products: unknown = await productsResponse.json();
    if (!productsResponse.ok) return Response.json({ success: false, message: "No se pudieron consultar productos de CJ" }, { status: 502 });
    const record = products && typeof products === "object" ? products as { data?: { list?: unknown[] } } : null;
    const safeProducts = Array.isArray(record?.data?.list) ? record.data.list.map((product) => {
      const item = product && typeof product === "object" ? product as Record<string, unknown> : {};
      return { id: String(item.id ?? item.pid ?? ""), name: typeof item.productName === "string" ? item.productName : typeof item.name === "string" ? item.name : "Producto CJ", sku: typeof item.sku === "string" ? item.sku : undefined };
    }) : [];
    return Response.json({ success: true, products: safeProducts });

  } catch (error) {
    console.error("CJ products query failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return Response.json({ success: false, message: "No se pudieron consultar productos de CJ" }, { status: 502 });
  }
}
