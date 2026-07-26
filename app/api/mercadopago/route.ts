import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getDb } from "@/lib/mongo";

interface MercadoPagoRequest {
  orderId: string;
  origin?: string;
  customer?: {
    email?: string;
  };
}

async function authorizeOrderAccess(order: any, customerEmail?: string) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;
  const userRole = (session?.user as { role?: string })?.role;

  if (userRole === "admin") {
    return true;
  }

  if (userEmail) {
    return order.customerEmail === userEmail;
  }

  if (typeof customerEmail === "string" && customerEmail.trim()) {
    return String(order.customer?.email ?? order.customerEmail ?? "").toLowerCase() === String(customerEmail).trim().toLowerCase();
  }

  return false;
}

export async function POST(request: Request) {
  try {
    const body: MercadoPagoRequest = await request.json();
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json({ success: false, message: "Mercado Pago no configurado" }, { status: 500 });
    }

    if (!body.orderId || !ObjectId.isValid(body.orderId)) {
      return NextResponse.json({ success: false, message: "OrderId inválido para Mercado Pago" }, { status: 400 });
    }

    const db = await getDb();
    const order = await db.collection("orders").findOne({ _id: new ObjectId(body.orderId) });

    if (!order) {
      return NextResponse.json({ success: false, message: "La orden no existe" }, { status: 404 });
    }

    if (!authorizeOrderAccess(order, body.customer?.email)) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });
    }

    if (!Array.isArray(order.items) || order.items.length === 0) {
      return NextResponse.json({ success: false, message: "La orden no tiene items válidos" }, { status: 400 });
    }

    if (order.status !== "pending" || order.paymentStatus === "approved") {
      return NextResponse.json({ success: false, message: "La orden no está en estado pendiente" }, { status: 400 });
    }

    const items = order.items.map((item: any) => {
      if (!item.name || item.price == null || !item.quantity) {
        throw new Error("Producto inválido en la orden");
      }

      return {
        title: String(item.name),
        quantity: Number(item.quantity),
        unit_price: Number(item.price),
        currency_id: process.env.MERCADOPAGO_CURRENCY ?? "ARS",
        picture_url: item.image || undefined,
      };
    });

    const origin = body.origin || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const preference = {
      items,
      back_urls: {
        success: `${origin}/checkout/success`,
        failure: `${origin}/checkout/failure`,
        pending: `${origin}/checkout/pending`,
      },
      auto_return: "approved",
      external_reference: String(body.orderId),
      metadata: {
        orderId: String(body.orderId),
        customerEmail: body.customer?.email ?? order.customer?.email ?? null,
      },
      notification_url: `${origin}/api/webhooks/mercadopago`,
    };

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preference),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("ERROR MERCADO PAGO:", data);
      return NextResponse.json({ success: false, message: data.message || "Error creando pago" }, { status: 500 });
    }

    await db.collection("orders").updateOne({ _id: new ObjectId(body.orderId) }, { $set: { preferenceId: data.id ?? null, initPoint: data.init_point ?? null, updatedAt: new Date() } });

    return NextResponse.json({ success: true, preferenceId: data.id, initPoint: data.init_point });
  } catch (error) {
    console.error("ERROR API MERCADOPAGO:", error);
    return NextResponse.json({ success: false, message: "Error interno procesando pago" }, { status: 500 });
  }
}
