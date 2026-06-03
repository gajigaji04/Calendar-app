export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2024-11-20' });

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { persistSession: false } }
  );
}

async function setPlan(userId, plan) {
  const sb = getServiceClient();
  await sb.from('user_plans').upsert(
    { user_id: userId, plan, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
}

/**
 * POST /api/stripe/webhook
 * Stripe → 구독 성공/취소 시 자동 호출
 */
export async function POST(request) {
  const body      = await request.text();
  const signature = request.headers.get('stripe-signature') ?? '';

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET ?? '');
  } catch (e) {
    return NextResponse.json({ error: `Webhook 서명 오류: ${e.message}` }, { status: 400 });
  }

  const session = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed': {
      const userId = session.metadata?.user_id ?? session.client_reference_id;
      const plan   = session.metadata?.plan ?? 'pro';
      if (userId) await setPlan(userId, plan);
      break;
    }
    case 'customer.subscription.deleted': {
      // 구독 취소 → 무료로 다운그레이드
      const customerId = session.customer;
      if (customerId) {
        const customers = await stripe.customers.list({ limit: 1, email: undefined });
        // customer_id → user_id 매핑이 없으면 metadata에서 조회
        const sub = await stripe.subscriptions.retrieve(session.id).catch(() => null);
        const userId = sub?.metadata?.user_id;
        if (userId) await setPlan(userId, 'free');
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
