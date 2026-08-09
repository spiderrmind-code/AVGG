import { NextResponse } from "next/server";
import { getPublicCategories } from "@/lib/public-categories";

export async function GET() {
  const categories = await getPublicCategories();
  return NextResponse.json({ success: true, categories });
}
