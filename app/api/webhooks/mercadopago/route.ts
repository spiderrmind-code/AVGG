import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = await getDb();

    if (body?.action === "payment.updated" || body?.type === "payment") {
      const paymentId = body.data?.id ?? body?.resource?.id;
      const status = body?.action === "payment.updated" ? body?.data?.status : body?.status;

      if (!paymentId) {
        return NextResponse.json({ success: false, message: "Falta payment id" }, { status: 400 });
      }

      const paymentStatus = status === "approved" ? "approved" : status === "rejected" ? "rejected" : "pending";

      await db.collection("orders").updateMany(
        { paymentId },
        { $set: { paymentStatus, updatedAt: new Date() } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ERROR WEBHOOK MP:", error);
    return NextResponse.json({ success: false, message: "Error webhook" }, { status: 500 });
  }
}
