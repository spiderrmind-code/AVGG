import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getCjAccessToken } from "@/lib/cj/client";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return Response.json({ success: false, message: "No autorizado" }, { status: 401 });
  try {
    await getCjAccessToken();
    return Response.json({ success: true, authenticated: true });

  } catch (error) {
    console.error("CJ authentication check failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return Response.json({ success: false, message: "No se pudo verificar CJ" }, { status: 502 });
  }
}
