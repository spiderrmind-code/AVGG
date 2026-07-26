import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);

  if (!session) return <div>No autorizado</div>;

  return <h1 className="text-3xl p-6">Bienvenido {session.user?.email}</h1>;
}