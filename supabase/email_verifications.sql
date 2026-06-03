-- 이메일 인증 코드 테이블
-- Supabase Dashboard > SQL Editor 에서 실행하세요.

CREATE TABLE IF NOT EXISTS email_verifications (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  email      TEXT        NOT NULL,
  name       TEXT,
  code_hash  TEXT        NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN     DEFAULT FALSE,
  attempts   INTEGER     DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ev_email    ON email_verifications (email);
CREATE INDEX IF NOT EXISTS idx_ev_expires  ON email_verifications (expires_at);

-- 만료된 레코드 자동 삭제 (선택 — pg_cron 확장이 있을 때)
-- SELECT cron.schedule('delete-expired-verifications', '*/10 * * * *',
--   $$DELETE FROM email_verifications WHERE expires_at < NOW() - INTERVAL '1 hour'$$);

-- RLS: service role 키로만 접근 (클라이언트에서는 직접 접근 불가)
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;
-- 별도 policy 없음 → anon/authenticated 접근 차단, service role만 허용
