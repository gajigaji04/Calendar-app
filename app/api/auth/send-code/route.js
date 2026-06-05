import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sendVerificationEmail } from '@/lib/mailer';
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

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashCode(code, email) {
  const secret = process.env.CODE_SECRET || 'tc-otp-secret';
  return crypto.createHmac('sha256', secret).update(code + email.toLowerCase()).digest('hex');
}

function emailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

export async function POST(req) {
  const limited = rateLimit(req);
  if (limited) return limited;

  // ── 설정 점검 ──────────────────────────────────────────────
  if (!process.env.SUPABASE_SERVICE_KEY) {
    console.error('[send-code] SUPABASE_SERVICE_KEY 환경변수가 없습니다.');
    return NextResponse.json({ error: '서버 설정 오류: SUPABASE_SERVICE_KEY가 없습니다.' }, { status: 500 });
  }

  try {
    const { email, name } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: '유효한 이메일을 입력해주세요.' }, { status: 400 });
    }

    const admin = getAdmin();

    // ── 테이블 존재 여부 확인 ───────────────────────────────
    const { error: tableCheckError } = await admin
      .from('email_verifications')
      .select('id')
      .limit(1);

    if (tableCheckError) {
      const msg = tableCheckError.message || '';
      if (msg.includes('does not exist') || msg.includes('relation') || tableCheckError.code === '42P01') {
        console.error('[send-code] email_verifications 테이블이 없습니다. supabase/email_verifications.sql을 실행하세요.');
        return NextResponse.json({ error: 'DB 테이블 미설정: Supabase에서 email_verifications.sql을 실행해주세요.' }, { status: 500 });
      }
      // 권한 오류 = 서비스 키 문제
      if (msg.includes('permission') || msg.includes('policy') || tableCheckError.code === '42501') {
        console.error('[send-code] Supabase 권한 오류. SUPABASE_SERVICE_KEY가 service_role 키인지 확인하세요.');
        return NextResponse.json({ error: '서버 설정 오류: SUPABASE_SERVICE_KEY를 service_role 키로 확인해주세요.' }, { status: 500 });
      }
      throw tableCheckError;
    }

    // ── 60초 내 재전송 방지 ─────────────────────────────────
    const { data: recent } = await admin
      .from('email_verifications')
      .select('created_at')
      .eq('email', email.toLowerCase())
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (recent?.length > 0) {
      const elapsed = Date.now() - new Date(recent[0].created_at).getTime();
      if (elapsed < 60_000) {
        const wait = Math.ceil((60_000 - elapsed) / 1000);
        return NextResponse.json({ error: `${wait}초 후 다시 시도해주세요.` }, { status: 429 });
      }
    }

    // ── 기존 코드 삭제 후 새 코드 저장 ─────────────────────
    await admin.from('email_verifications').delete().eq('email', email.toLowerCase()).eq('used', false);

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: insertError } = await admin.from('email_verifications').insert({
      email:      email.toLowerCase(),
      name:       name || null,
      code_hash:  hashCode(code, email),
      expires_at: expiresAt,
    });

    if (insertError) throw insertError;

    // ── 이메일 전송 (SMTP 미설정 시 콘솔 출력으로 대체) ────
    if (emailConfigured()) {
      await sendVerificationEmail(email, name, code);
    } else {
      console.log(`\n========================================`);
      console.log(`[이메일 인증 코드 - SMTP 미설정, 개발 모드]`);
      console.log(`  수신: ${email}`);
      console.log(`  코드: ${code}`);
      console.log(`  유효: 5분`);
      console.log(`========================================\n`);
    }

    return NextResponse.json({ ok: true, devMode: !emailConfigured() });
  } catch (err) {
    console.error('[send-code] 오류:', err);
    await notifyServerError({ path: '/api/auth/send-code', message: err.message, stack: err.stack });
    return NextResponse.json({ error: `코드 전송 실패: ${err.message || '알 수 없는 오류'}` }, { status: 500 });
  }
}
