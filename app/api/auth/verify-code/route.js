import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { notifyServerError } from '@/lib/slackNotify';
import crypto from 'crypto';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function hashCode(code, email) {
  const secret = process.env.CODE_SECRET || 'tc-otp-secret';
  return crypto.createHmac('sha256', secret).update(code + email.toLowerCase()).digest('hex');
}

export async function POST(req) {
  const limited = rateLimit(req);
  if (limited) return limited;
  try {
    const { email, code, password, name } = await req.json();

    if (!email || !code || !password) {
      return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
    }

    const admin = getAdmin();

    // 코드 조회
    const { data: records } = await admin
      .from('email_verifications')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (!records || records.length === 0) {
      return NextResponse.json({ error: '인증 코드가 만료되었습니다. 코드를 다시 요청해주세요.' }, { status: 400 });
    }

    const record = records[0];

    // 시도 횟수 초과 (5회)
    if (record.attempts >= 5) {
      await admin.from('email_verifications').update({ used: true }).eq('id', record.id);
      return NextResponse.json({ error: '시도 횟수를 초과했습니다. 코드를 다시 요청해주세요.' }, { status: 400 });
    }

    // 코드 검증
    if (record.code_hash !== hashCode(code, email)) {
      await admin
        .from('email_verifications')
        .update({ attempts: record.attempts + 1 })
        .eq('id', record.id);
      const remaining = 4 - record.attempts;
      return NextResponse.json({
        error: `인증 코드가 올바르지 않습니다.${remaining > 0 ? ` (남은 시도: ${remaining}회)` : ''}`,
      }, { status: 400 });
    }

    // 코드 사용 처리
    await admin.from('email_verifications').update({ used: true }).eq('id', record.id);

    // Supabase 유저 생성 (이메일 인증 완료 상태)
    const { error: createError } = await admin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { name: name || record.name || '' },
    });

    if (createError) {
      if (createError.message?.includes('already been registered') || createError.message?.includes('already registered')) {
        return NextResponse.json({ error: '이미 가입된 이메일입니다. 로그인을 시도해보세요.' }, { status: 409 });
      }
      throw createError;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[verify-code]', err);
    await notifyServerError({ path: '/api/auth/verify-code', message: err.message, stack: err.stack });
    return NextResponse.json({ error: '인증 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
