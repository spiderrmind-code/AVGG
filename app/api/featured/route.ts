import { NextResponse } from "next/server";


export async function GET() {


  const featured = [
    {
      title: "AVG Connects",
      description:
        "Productos seleccionados con envío rápido."
    }
  ];



  return NextResponse.json(featured);

}