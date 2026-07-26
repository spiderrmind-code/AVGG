import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Analytics event:", body);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, message: "No se pudo registrar evento" }, { status: 400 });
  }
}
