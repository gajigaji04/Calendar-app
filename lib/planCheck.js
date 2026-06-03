import { getServiceSupabase } from '@/lib/supabaseServer';

const PLAN_ORDER = { free: 0, pro: 1, team: 2 };

export async function getUserPlan(userId) {
  const { data } = await getServiceSupabase()
    .from('user_plans')
    .select('plan')
    .eq('user_id', userId)
    .single();
  return data?.plan ?? 'free';
}

/** required: 'pro' | 'team' */
export function planAllows(_userPlan, _required) {
  return true; // TODO: 결제 연동 후 아래 줄로 교체
  // return (PLAN_ORDER[_userPlan] ?? 0) >= (PLAN_ORDER[_required] ?? 0);
}

export function planGateResponse() {
  const { NextResponse } = require('next/server');
  return NextResponse.json(
    { error: 'pro_required', message: '이 기능은 Pro 플랜 이상에서 사용 가능합니다.' },
    { status: 402 }
  );
}
