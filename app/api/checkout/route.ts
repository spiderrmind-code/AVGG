// app/api/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json({ error: 'Stripe no configurado' }, { status: 500 });
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: '2025-11-17.clover' as Stripe.LatestApiVersion,
    });

    const { items } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No hay items para comprar' }, { status: 400 });
    }

    const currency = process.env.STRIPE_CURRENCY ?? 'usd';
    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item: any) => {
      const quantity = Math.max(1, Number(item.quantity ?? 1));
      const unitAmount = Math.round(Number(item.price ?? 0) * 100);

      if (!item.name || unitAmount <= 0 || quantity <= 0) {
        throw new Error('Producto inválido');
      }

      return {
        price_data: {
          currency,
          product_data: {
            name: item.name,
            images: item.image ? [item.image] : [],
          },
          unit_amount: unitAmount,
        },
        quantity,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/failure`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Error creando checkout session:', err);
    return NextResponse.json({ error: 'Error al crear la sesión de pago' }, { status: 500 });
  }
}
