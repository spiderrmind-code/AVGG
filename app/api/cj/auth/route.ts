import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return Response.json({ success: false, message: "No autorizado" }, { status: 401 });
  try {
    if (!process.env.CJ_API_KEY) return Response.json({ success: false, message: "CJ no configurado" }, { status: 503 });
    const response = await fetch(
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

    if (!response.ok) return Response.json({ success: false, authenticated: false }, { status: 502 });
    return Response.json({ success: true, authenticated: true });

  } catch (error) {
    console.error("CJ authentication check failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return Response.json({ success: false, message: "No se pudo verificar CJ" }, { status: 502 });
  }
}
