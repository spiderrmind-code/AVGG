import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json({ success: true, initPoint: null, message: "Mercado Pago no configurado; el pedido quedó registrado para revisión manual." }, { status: 200 });
    }

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: body.items.map((item: { name: string; price: number; quantity: number; image?: string }) => ({
          title: item.name,
          unit_price: Number(item.price),
          quantity: Number(item.quantity),
          picture_url: item.image,
        })),
        back_urls: {
          success: `${body.origin}/checkout/success`,
          failure: `${body.origin}/checkout/failure`,
          pending: `${body.origin}/checkout/pending`,
        },
        auto_return: "approved",
        metadata: {
          orderId: body.orderId,
          customerEmail: body.customer?.email,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ success: false, message: data.message || "Error creando preferencia" }, { status: 500 });
    }

    return NextResponse.json({ success: true, preferenceId: data.id, initPoint: data.init_point });
  } catch (error) {
    console.error("ERROR MERCADOPAGO:", error);
    return NextResponse.json({ success: false, message: "Error creando preferencia de pago" }, { status: 500 });
  }
}
