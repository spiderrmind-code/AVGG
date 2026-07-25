// /app/api/banners/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongo";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || undefined);
    const rows = await db.collection("banners").find({}).toArray();
    const banners = rows.map((r: any) => ({ ...r, _id: r._id?.toString?.() ?? r._id }));
    return NextResponse.json(banners);
  } catch (err) {
    console.error("API /banners error:", err);
    return NextResponse.json({ error: "No se pudieron cargar los banners" }, { status: 500 });
  }
}
