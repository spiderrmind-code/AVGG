import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getDb } from '@/lib/mongo';

interface CheckoutFromOrderRequest {
  orderId: string;
  customerEmail?: string;
}

async function authorizeOrderAccess(order: any, customerEmail?: string) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;
  const userRole = (session?.user as { role?: string })?.role;

  if (userRole === 'admin') {
    return true;
  }

  if (userEmail) {
    return order.customerEmail === userEmail;
  }

  if (typeof customerEmail === 'string' && customerEmail.trim()) {
    return String(order.customer?.email ?? order.customerEmail ?? '').toLowerCase() === String(customerEmail).trim().toLowerCase();
  }

  return false;
}

export async function POST(request: Request) {
  try {
    const body: CheckoutFromOrderRequest = await request.json();
    const { orderId, customerEmail } = body;

    if (!orderId || !ObjectId.isValid(orderId)) {
      return NextResponse.json({ success: false, message: 'orderId inválido' }, { status: 400 });
    }

    const db = await getDb();
    const order = await db.collection('orders').findOne({ _id: new ObjectId(orderId) });

    if (!order) {
      return NextResponse.json({ success: false, message: 'Orden no encontrada' }, { status: 404 });
    }

    if (!(await authorizeOrderAccess(order, customerEmail))) {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
    }

    if (order.status !== 'pending' || order.paymentStatus === 'approved') {
      return NextResponse.json({ success: false, message: 'La orden no está en estado pendiente' }, { status: 400 });
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ success: false, message: 'Stripe no configurado' }, { status: 500 });
    }

    const stripe = new Stripe(secretKey, { apiVersion: '2025-11-17.clover' as Stripe.LatestApiVersion });

    const currency = process.env.STRIPE_CURRENCY ?? 'usd';
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

    const line_items = (order.items || []).map((it: any) => ({
      price_data: {
        currency,
        product_data: {
          name: it.name,
          images: it.image ? [it.image] : [],
        },
        unit_amount: Math.round(Number(it.price || 0) * 100),
      },
      quantity: Number(it.quantity || 1),
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items,
      metadata: { orderId: String(orderId) },
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/failure`,
    });

    await db.collection('orders').updateOne({ _id: new ObjectId(orderId) }, { $set: { paymentProvider: 'stripe', stripeSessionId: session.id, updatedAt: new Date() } });

    return NextResponse.json({ success: true, url: session.url });
  } catch (err) {
    console.error('Error creating stripe session from order:', err);
    return NextResponse.json({ success: false, message: 'Error creando sesión de pago' }, { status: 500 });
  }
}
