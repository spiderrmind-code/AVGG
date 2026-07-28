import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ success: false, message: "Stripe no está habilitado para pagos públicos" }, { status: 410 });
}
