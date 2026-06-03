export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { notifyPaymentSuccess, notifyPaymentFailure } from '@/lib/slackNotify';


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

async function recordPayment(userId, session) {
  const sb = getServiceClient(); // service_role → RLS 우회
  await sb.from('payments').insert({
    user_id:  userId,
    amount:   session.amount_total ?? 0,
    currency: (session.currency ?? 'krw').toUpperCase(),
    status:   'paid',
  });
}

/**
 * POST /api/stripe/webhook
 * Stripe → 구독 성공/취소 시 자동 호출
 */
export async function POST(request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: 'Stripe가 설정되지 않았습니다.' }, { status: 503 });
  }
  const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20' });

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
      if (userId) {
        await setPlan(userId, plan);
        await recordPayment(userId, session);
      }
      await notifyPaymentSuccess({
        email:    session.customer_email,
        amount:   session.amount_total,
        currency: session.currency?.toUpperCase(),
        plan,
      });
      break;
    }
    case 'payment_intent.payment_failed': {
      const reason = session.last_payment_error?.message ?? '알 수 없는 오류';
      const email  = session.receipt_email ?? session.metadata?.email;
      await notifyPaymentFailure({ email, reason, plan: session.metadata?.plan });
      break;
    }
    case 'checkout.session.expired': {
      await notifyPaymentFailure({
        email:  session.customer_email,
        reason: '결제 세션 만료 (시간 초과 또는 이탈)',
        plan:   session.metadata?.plan,
      });
      break;
    }
    case 'customer.subscription.deleted': {
      // 구독 취소 → 무료로 다운그레이드 (subscription metadata에서 user_id 조회)
      const sub = await stripe.subscriptions.retrieve(session.id).catch(() => null);
      const userId = sub?.metadata?.user_id;
      if (userId) await setPlan(userId, 'free');
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
