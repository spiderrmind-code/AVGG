import { NextResponse } from "next/server";
import { runAiChat } from "@/lib/ai/engine";
import { checkRateLimitDistributed, requestIdentifier } from "@/lib/request-rate-limit";
import { hasJsonContentType, hasTrustedOrigin } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ success: false, message: "Origen no permitido" }, { status: 403 });
  }
  if (!hasJsonContentType(request)) {
    return NextResponse.json({ success: false, message: "Content-Type inválido" }, { status: 415 });
  }

  const limit = await checkRateLimitDistributed(`ai-chat:${requestIdentifier(request)}`, 20, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, message: "Demasiadas consultas. Probá de nuevo en unos minutos." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  try {
    const body: unknown = await request.json();
    if (!isRecord(body) || typeof body.message !== "string" || !body.message.trim() || body.message.length > 600) {
      return NextResponse.json({ success: false, message: "El mensaje no es válido" }, { status: 400 });
    }

    const result = await runAiChat({
      message: body.message,
      history: body.history,
      conversation: body.conversation,
      selectionProductId: body.selectionProductId,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("AVG AI chat failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json(
      { success: false, message: "No pude consultar el catálogo ahora. Intentá de nuevo en unos minutos." },
      { status: 503 },
    );
  }
}
