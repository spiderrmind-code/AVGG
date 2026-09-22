import { NextResponse } from "next/server";
import { DropsheableApiError, DropsheableConfigurationError, getDropsheableProducts } from "@/lib/dropsheable/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });
  try {
    const params = new URL(request.url).searchParams;
    const offset = params.has("offset") ? Number(params.get("offset")) : undefined;
    return NextResponse.json(await getDropsheableProducts({ offset }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof DropsheableConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof DropsheableApiError) {
      return NextResponse.json(error.responseBody, { status: error.status, headers: error.retryAfter ? { "Retry-After": String(error.retryAfter) } : undefined });
    }

    return NextResponse.json({ error: "No se pudo consultar Dropsheable" }, { status: 502 });
  }
}