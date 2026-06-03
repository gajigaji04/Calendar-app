export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServerUser } from '@/lib/supabaseServer';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2024-11-20' });

const PRICE_MAP = {
  pro:  process.env.STRIPE_PRICE_PRO,
  team: process.env.STRIPE_PRICE_TEAM,
};

/**
 * POST /api/stripe/checkout
 * body: { plan: 'pro' | 'team' }
 * → Stripe Checkout 세션 URL 반환
 */
export async function POST(request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe가 설정되지 않았습니다.' }, { status: 503 });
  }

  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const { plan } = await request.json().catch(() => ({}));
  const priceId  = PRICE_MAP[plan];
  if (!priceId)  return NextResponse.json({ error: '유효하지 않은 플랜입니다.' }, { status: 400 });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    mode:               'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    customer_email:      user.email,
    success_url: `${baseUrl}/settings?upgraded=${plan}`,
    cancel_url:  `${baseUrl}/pricing`,
    metadata: { user_id: user.id, plan },
  });

  return NextResponse.json({ url: session.url });
}
