// /app/api/banners/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongo";
import type { Document, WithId } from "mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || undefined);
    const rows = await db.collection<Document>("banners").find({}).toArray();
    const banners = rows.map((row: WithId<Document>) => ({ ...row, _id: row._id.toString() }));
    return NextResponse.json(banners);
  } catch (err) {
    console.error("API /banners error:", err);
    return NextResponse.json({ error: "No se pudieron cargar los banners" }, { status: 500 });
  }
}
