export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { getServerUser } from '@/lib/supabaseServer';
import { buildAuthUrl } from '@/lib/integrations/googleCalendar';

export async function GET(request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.json(
      { error: 'GOOGLE_CLIENT_ID 환경변수가 설정되지 않았습니다.' },
      { status: 503 }
    );
  }

  const url = buildAuthUrl(user.id);
  return NextResponse.redirect(url);
}
