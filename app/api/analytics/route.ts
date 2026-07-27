import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({ success: true, received: Boolean(body?.event) });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, message: "No se pudo registrar evento" }, { status: 400 });
  }
}
