import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return Response.json({ success: false, message: "No autorizado" }, { status: 401 });
  return Response.json({ success: true });
}
