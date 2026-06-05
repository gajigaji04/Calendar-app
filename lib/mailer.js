import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(to, name, code) {
  const from = process.env.RESEND_FROM || 'TeamCalendar <onboarding@resend.dev>';

  const { error } = await resend.emails.send({
    from,
    to,
    subject: `[TeamCalendar] 이메일 인증 코드: ${code}`,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#070711;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Apple SD Gothic Neo','Noto Sans KR',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#070711;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding-bottom:28px;">
            <span style="font-size:22px;font-weight:900;color:#f0f0ff;">Team<span style="color:#818cf8;">Calendar</span></span>
          </td>
        </tr>
        <tr>
          <td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:36px;text-align:center;">
            <p style="color:rgba(255,255,255,0.55);font-size:15px;line-height:1.6;margin:0 0 28px;">
              안녕하세요${name ? `, <strong style="color:#f0f0ff;">${name}</strong>님` : ''}!<br/>
              아래 6자리 코드를 입력해 이메일을 인증해주세요.
            </p>
            <div style="background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.5);border-radius:14px;padding:24px 32px;display:inline-block;">
              <div style="font-size:44px;font-weight:900;letter-spacing:14px;color:#a5b4fc;font-family:monospace;">${code}</div>
            </div>
            <p style="color:rgba(255,255,255,0.3);font-size:13px;margin:24px 0 0;line-height:1.6;">
              이 코드는 <strong style="color:rgba(255,255,255,0.55);">5분</strong> 동안 유효합니다.<br/>
              본인이 요청하지 않았다면 이 메일을 무시해주세요.
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top:24px;">
            <p style="color:rgba(255,255,255,0.2);font-size:12px;margin:0;">
              © TeamCalendar · 이 메일은 자동으로 발송되었습니다.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  if (error) throw new Error(error.message);
}
