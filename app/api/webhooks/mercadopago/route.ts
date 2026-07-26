import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = await getDb();

    const paymentId = body?.data?.id ?? body?.resource?.id ?? body?.id;
    const orderId =
      body?.data?.external_reference ??
      body?.resource?.external_reference ??
      body?.data?.metadata?.orderId ??
      body?.resource?.metadata?.orderId ??
      body?.external_reference;
    const status =
      body?.action === "payment.updated"
        ? body?.data?.status
        : body?.resource?.status ?? body?.status ?? body?.data?.status ?? body?.data?.collection_status;

    if (!paymentId && !orderId) {
      return NextResponse.json({ success: false, message: "Falta paymentId u orderId" }, { status: 400 });
    }

    const paymentStatus = status === "approved" ? "approved" : status === "rejected" ? "rejected" : "pending";
    const updateFields: Record<string, unknown> = {
      paymentStatus,
      updatedAt: new Date(),
    };

    if (paymentId) {
      updateFields.paymentId = paymentId;
    }

    if (orderId && ObjectId.isValid(orderId)) {
      await db.collection("orders").updateOne(
        { _id: new ObjectId(orderId) },
        { $set: updateFields }
      );
    } else if (paymentId) {
      await db.collection("orders").updateMany(
        { paymentId },
        { $set: updateFields }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ERROR WEBHOOK MP:", error);
    return NextResponse.json({ success: false, message: "Error webhook" }, { status: 500 });
  }
}
