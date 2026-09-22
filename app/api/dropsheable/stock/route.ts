import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { DropsheableApiError, DropsheableConfigurationError, getDropsheableStock } from "@/lib/dropsheable/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });
  try {
    return NextResponse.json(await getDropsheableStock(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof DropsheableConfigurationError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof DropsheableApiError) return NextResponse.json(error.responseBody, { status: error.status, headers: error.retryAfter ? { "Retry-After": String(error.retryAfter) } : undefined });
    return NextResponse.json({ error: "No se pudo consultar Dropsheable" }, { status: 502 });
  }
}