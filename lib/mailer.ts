import type { Language } from '@/i18n/translations';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_EMAIL_FROM = 'Scrolly <no-reply@scrolly.live>';
const DEFAULT_CONTACT_RECIPIENT = 'contact@scrolly.live';

export interface MailDeliveryResult {
  ok: boolean;
  delivery: 'resend' | 'dev_preview';
  recipient?: string;
  id?: string;
  error?: string;
}

function getResendApiKey(): string {
  return (process.env.RESEND_API_KEY || '').trim();
}

export function hasResendApiKey(): boolean {
  return getResendApiKey().length > 0;
}

export function getEmailFromAddress(): string {
  return (process.env.EMAIL_FROM || '').trim() || DEFAULT_EMAIL_FROM;
}

export function getContactRecipientEmail(): string {
  return (process.env.CONTACT_RECIPIENT_EMAIL || '').trim() || DEFAULT_CONTACT_RECIPIENT;
}

function stripHeaderBreaks(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function postToResend(payload: {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  reply_to?: string;
}): Promise<MailDeliveryResult> {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[lib/mailer] RESEND_API_KEY is not configured in production.');
      return {
        ok: false,
        delivery: 'resend',
        error: 'email_provider_unconfigured',
      };
    }
    return {
      ok: true,
      delivery: 'dev_preview',
      recipient: payload.to[0],
    };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error('[lib/mailer] Resend API returned error:', res.status, errBody.slice(0, 400));
      return {
        ok: false,
        delivery: 'resend',
        recipient: payload.to[0],
        error: 'resend_delivery_failed',
      };
    }

    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return {
      ok: true,
      delivery: 'resend',
      recipient: payload.to[0],
      ...(typeof data.id === 'string' ? { id: data.id } : {}),
    };
  } catch (err) {
    console.error('[lib/mailer] Resend API request failed:', err);
    return {
      ok: false,
      delivery: 'resend',
      recipient: payload.to[0],
      error: 'resend_network_failed',
    };
  }
}

export async function sendOtpEmail(params: {
  to: string;
  code: string;
  lang?: Language;
  expiresInMin?: number;
}): Promise<MailDeliveryResult> {
  const safeTo = stripHeaderBreaks(params.to).toLowerCase();
  const safeCode = stripHeaderBreaks(params.code);
  const lang: Language = params.lang === 'en' ? 'en' : 'tr';
  const expiresInMin = Math.max(1, Math.floor(params.expiresInMin ?? 10));

  const subject =
    lang === 'en'
      ? `Your Scrolly Sign-In Code: ${safeCode}`
      : `Scrolly Giriş Kodun: ${safeCode}`;

  const headline =
    lang === 'en'
      ? 'Verify your email to sync your Scrolly progress'
      : 'Scrolly ilerlemeni eşitlemek için e-postanı doğrula';

  const intro =
    lang === 'en'
      ? `Enter the 6-digit verification code below within ${expiresInMin} minutes to link your XP, streak, saved cards, and word notebook across devices.`
      : `XP, seri, kaydedilen kartlar ve kelime defterini cihazlar arasında eşitlemek için aşağıdaki 6 haneli doğrulama kodunu ${expiresInMin} dakika içinde gir.`;

  const securityNote =
    lang === 'en'
      ? 'This code can only be used once. If you did not request it, you can safely ignore this email.'
      : 'Bu kod yalnızca bir kez kullanılabilir. Bu isteği sen yapmadıysan bu e-postayı güvenle yok sayabilirsin.';

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background-color:#0b0b12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f5f3ff;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;margin:0 auto;background-color:#151326;border:1px solid #2e2652;border-radius:16px;overflow:hidden;">
    <tr>
      <td style="padding:28px 28px 16px 28px;">
        <div style="font-size:13px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#a78bfa;">SCROLLY.LIVE</div>
        <h1 style="margin:10px 0 0 0;font-size:20px;line-height:1.35;color:#ffffff;">${escapeHtml(headline)}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:0 28px 20px 28px;">
        <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#d8d2f0;">${escapeHtml(intro)}</p>
        <div style="background-color:#0d0b18;border:1px solid #4c3b8d;border-radius:12px;padding:18px;text-align:center;">
          <span style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:32px;font-weight:800;letter-spacing:0.28em;color:#ffffff;">${escapeHtml(safeCode)}</span>
        </div>
        <p style="margin:18px 0 0 0;font-size:12px;line-height:1.5;color:#9f96c4;">${escapeHtml(securityNote)}</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    'SCROLLY.LIVE',
    '',
    headline,
    '',
    intro,
    '',
    `${lang === 'en' ? 'Verification code' : 'Doğrulama kodu'}: ${safeCode}`,
    `${lang === 'en' ? 'Expires in' : 'Geçerlilik süresi'}: ${expiresInMin} min`,
    '',
    securityNote,
  ].join('\n');

  return postToResend({
    from: getEmailFromAddress(),
    to: [safeTo],
    subject: stripHeaderBreaks(subject),
    html,
    text,
  });
}

export async function sendContactEmail(params: {
  name: string;
  email: string;
  subject: string;
  message: string;
  lang: Language;
}): Promise<MailDeliveryResult> {
  const recipient = getContactRecipientEmail();
  const safeName = stripHeaderBreaks(params.name);
  const safeSenderEmail = stripHeaderBreaks(params.email);
  const safeTopic = stripHeaderBreaks(params.subject);
  const safeMessage = params.message.trim();
  const langLabel = params.lang === 'en' ? 'EN' : 'TR';
  const emailSubject = stripHeaderBreaks(`[Scrolly Contact] ${safeTopic} (${safeName})`);

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:12px;">
    <tr>
      <td style="padding:24px;">
        <div style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#6d28d9;">SCROLLY CONTACT DESK (${langLabel})</div>
        <h2 style="margin:8px 0 16px 0;font-size:18px;color:#0f172a;">${escapeHtml(safeTopic)}</h2>
        <p style="margin:0 0 6px 0;font-size:13px;"><strong>From:</strong> ${escapeHtml(safeName)} &lt;${escapeHtml(safeSenderEmail)}&gt;</p>
        <p style="margin:0 0 16px 0;font-size:13px;"><strong>Topic:</strong> ${escapeHtml(safeTopic)}</p>
        <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(safeMessage)}</div>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `SCROLLY CONTACT DESK (${langLabel})`,
    `Topic: ${safeTopic}`,
    `From: ${safeName} <${safeSenderEmail}>`,
    '',
    safeMessage,
  ].join('\n');

  return postToResend({
    from: getEmailFromAddress(),
    to: [recipient],
    subject: emailSubject,
    html,
    text,
    reply_to: safeSenderEmail,
  });
}
