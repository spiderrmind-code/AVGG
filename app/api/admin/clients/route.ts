import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { requireAuthSecret } from "@/lib/auth-secret";
import { checkAppointmentRateLimit } from "@/lib/appointments";
import { requestIdentifier } from "@/lib/request-rate-limit";
import { logServerError } from "@/lib/logger";
import { getStudioDb } from "@/lib/studio-mongo";
import { isAuthorizedStudioAdmin, isStudioDeployment } from "@/lib/studio-routes";

export async function GET(request: Request) {
  if (!isStudioDeployment()) return NextResponse.json({ message: "No encontrado" }, { status: 404 });
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  if (!isAuthorizedStudioAdmin(session.user.email, session.user.role)) return NextResponse.json({ message: "No autorizado" }, { status: 403 });

  try {
    const db = await getStudioDb();
    const limit = await checkAppointmentRateLimit(db, `admin-clients:${session.user.id}:${requestIdentifier(request)}`, requireAuthSecret(), 60, 10 * 60 * 1000);
    if (!limit.allowed) return NextResponse.json({ message: "Demasiadas solicitudes." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });

    const url = new URL(request.url);
    const page = Math.max(1, Math.min(100_000, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1));
    const pageSize = 25;
    const users = db.collection("users");
    const [clients, total] = await Promise.all([
      users.find({ role: "customer" }, { projection: { name: 1, email: 1, phone: 1, createdAt: 1 } })
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray(),
      users.countDocuments({ role: "customer" }),
    ]);
    return NextResponse.json({
      clients: clients.map(({ _id, name, email, phone, createdAt }) => ({
        id: String(_id),
        name: typeof name === "string" ? name : "",
        email,
        phone: typeof phone === "string" ? phone : "",
        createdAt,
      })),
      page,
      pageSize,
      total,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logServerError("studio_admin_clients_list_failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ message: "No se pudieron cargar los clientes." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
