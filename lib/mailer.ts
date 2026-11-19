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
  errorCode?: string;
}

function getResendApiKey(): string {
  return (process.env.RESEND_API_KEY || '').trim();
}

export function hasResendApiKey(): boolean {
  return getResendApiKey().length > 0;
}

/** Strip accidental quotes/whitespace from Heroku config EMAIL_FROM. */
export function sanitizeEmailFrom(raw: string | null | undefined): string {
  return String(raw || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();
}

export function getEmailFromAddress(): string {
  return stripHeaderBreaks(sanitizeEmailFrom(process.env.EMAIL_FROM) || DEFAULT_EMAIL_FROM);
}

export function getContactRecipientEmail(): string {
  // Accept both names: checklist CONTACT_RECEIVER_EMAIL + legacy CONTACT_RECIPIENT_EMAIL.
  return stripHeaderBreaks(
    (process.env.CONTACT_RECEIVER_EMAIL || '').trim() ||
      (process.env.CONTACT_RECIPIENT_EMAIL || '').trim() ||
      DEFAULT_CONTACT_RECIPIENT
  );
}

function stripHeaderBreaks(value: string): string {
  return String(value || '').replace(/[\r\n\0]+/g, ' ').trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function logResendContext(extra: Record<string, unknown>): void {
  console.error('[lib/mailer] Resend delivery diagnostics', {
    hasResendApiKey: hasResendApiKey(),
    emailFrom: getEmailFromAddress(),
    ...extra,
  });
}

async function postToResend(payload: {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  reply_to?: string;
}): Promise<MailDeliveryResult> {
  const sanitizedPayload = {
    ...payload,
    from: stripHeaderBreaks(payload.from),
    to: payload.to.map((addr) => stripHeaderBreaks(addr)).filter(Boolean),
    subject: stripHeaderBreaks(payload.subject),
    ...(payload.reply_to ? { reply_to: stripHeaderBreaks(payload.reply_to) } : {}),
  };

  const apiKey = getResendApiKey();
  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      logResendContext({
        error: { message: 'RESEND_API_KEY missing' },
        data: null,
        errorCode: 'email_provider_unconfigured',
      });
      return {
        ok: false,
        delivery: 'resend',
        error: 'email_provider_unconfigured',
        errorCode: 'email_provider_unconfigured',
      };
    }
    return {
      ok: true,
      delivery: 'dev_preview',
      recipient: sanitizedPayload.to[0],
    };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sanitizedPayload),
      signal: AbortSignal.timeout(10_000),
    });

    const rawBody = await res.text().catch(() => '');
    type ResendPayload = { id?: string; message?: string; name?: string; statusCode?: number };
    let parsed: ResendPayload | null = null;
    try {
      parsed = rawBody ? (JSON.parse(rawBody) as ResendPayload) : null;
    } catch {
      parsed = null;
    }

    // Mirror Resend SDK `{ data, error }` shape in Heroku logs for OTP debugging.
    if (!res.ok) {
      const error: ResendPayload =
        parsed ??
        { message: rawBody.slice(0, 400) || `HTTP ${res.status}`, statusCode: res.status };
      logResendContext({
        data: null,
        error,
        httpStatus: res.status,
        errorCode: 'resend_delivery_failed',
        toDomain: payload.to[0]?.split('@')[1] || null,
      });
      return {
        ok: false,
        delivery: 'resend',
        recipient: payload.to[0],
        error: 'resend_delivery_failed',
        errorCode: 'resend_delivery_failed',
      };
    }

    const dataId = typeof parsed?.id === 'string' ? parsed.id : undefined;
    return {
      ok: true,
      delivery: 'resend',
      recipient: payload.to[0],
      ...(dataId ? { id: dataId } : {}),
    };
  } catch (err) {
    logResendContext({
      data: null,
      error: err instanceof Error ? { message: err.message, name: err.name } : { message: String(err) },
      errorCode: 'resend_network_failed',
    });
    return {
      ok: false,
      delivery: 'resend',
      recipient: payload.to[0],
      error: 'resend_network_failed',
      errorCode: 'resend_network_failed',
    };
  }
}

export async function sendOtpEmail(params: {
  to: string;
  code: string;
  locale?: Language;
  lang?: Language;
  expiresInMin?: number;
}): Promise<MailDeliveryResult> {
  const safeTo = stripHeaderBreaks(params.to).toLowerCase();
  const safeCode = stripHeaderBreaks(params.code);
  const lang: Language = (params.locale ?? params.lang) === 'en' ? 'en' : 'tr';
  const expiresInMin = Math.max(1, Math.floor(params.expiresInMin ?? 10));
  const from = getEmailFromAddress();

  console.info('[lib/mailer] sendOtpEmail attempt', {
    hasResendApiKey: hasResendApiKey(),
    emailFrom: from,
    locale: lang,
    toDomain: safeTo.includes('@') ? safeTo.split('@')[1] : null,
  });

  const subject =
    lang === 'en'
      ? `Your Scrolly Sign-In Code: ${safeCode}`
      : `Scrolly Giriş Kodun: ${safeCode}`;

  const preheader =
    lang === 'en'
      ? `Your Scrolly verification code: ${safeCode} — valid for ${expiresInMin} minutes`
      : `Scrolly doğrulama kodun: ${safeCode} — ${expiresInMin} dakika geçerli`;

  const tagline =
    lang === 'en' ? 'Scroll · Learn · Wonder' : 'Kaydır · Öğren · Şaşır';

  const headline =
    lang === 'en' ? 'Your sign-in code is ready' : 'Giriş kodun hazır';

  const intro =
    lang === 'en'
      ? `Enter the 6-digit code below within ${expiresInMin} minutes to sync your XP, streak, saved facts, and Word Lab across devices.`
      : `XP, seri, kaydedilen kartlar ve kelime defterini cihazların arasında eşitlemek için aşağıdaki 6 haneli doğrulama kodunu ${expiresInMin} dakika içinde gir.`;

  const codeLabel =
    lang === 'en' ? 'Verification Code' : 'Doğrulama Kodu';

  const validityNote =
    lang === 'en'
      ? `This code is valid for ${expiresInMin} minutes and can only be used once.`
      : `Bu kod ${expiresInMin} dakika geçerlidir ve yalnızca tek kullanımlıktır.`;

  const ignoreNote =
    lang === 'en'
      ? "If you didn't request this code, you can safely ignore this email."
      : 'Bu isteği sen yapmadıysan güvenle yok sayabilirsin.';

  const homeUrl = lang === 'en' ? 'https://scrolly.live/en' : 'https://scrolly.live';
  const privacyUrl =
    lang === 'en' ? 'https://scrolly.live/privacy?lang=en' : 'https://scrolly.live/privacy';
  const contactUrl =
    lang === 'en' ? 'https://scrolly.live/contact?lang=en' : 'https://scrolly.live/contact';
  const privacyLabel = lang === 'en' ? 'Privacy' : 'Gizlilik';
  const contactLabel = lang === 'en' ? 'Contact' : 'İletişim';

  const preheaderPadding = '&zwnj;&nbsp;'.repeat(28);

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#FDF5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1F1720;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#FDF5F7;">
    ${escapeHtml(preheader)}${preheaderPadding}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#FDF5F7;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;margin:0 auto;background-color:#FFFFFF;border:1px solid #F1DCE3;border-radius:24px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 20px 28px;border-bottom:1px solid #F7E8ED;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td width="46" valign="middle" style="padding-right:12px;">
                    <img src="https://scrolly.live/icon-192.png" alt="Scrolly" width="36" height="36" style="display:block;width:36px;height:36px;border-radius:10px;border:0;" />
                  </td>
                  <td valign="middle">
                    <div style="font-size:18px;font-weight:800;line-height:1.2;color:#1F1720;">Scrolly</div>
                    <div style="margin-top:2px;font-size:12px;font-weight:600;line-height:1.3;color:#7A5C6A;">${escapeHtml(tagline)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 24px 28px;">
              <h1 style="margin:0 0 10px 0;font-size:22px;font-weight:800;line-height:1.3;color:#1F1720;">${escapeHtml(headline)}</h1>
              <p style="margin:0 0 24px 0;font-size:15px;font-weight:400;line-height:1.6;color:#5C4B55;">${escapeHtml(intro)}</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FFF3F7;border:1.5px solid #F2C6D4;border-radius:16px;">
                <tr>
                  <td align="center" style="padding:20px 24px;">
                    <div style="margin:0 0 8px 0;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#9E2450;">${escapeHtml(codeLabel)}</div>
                    <span style="display:inline-block;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,Courier,monospace;font-size:34px;font-weight:800;line-height:1.2;letter-spacing:10px;padding-left:10px;color:#9E2450;-webkit-user-select:all;user-select:all;">${escapeHtml(safeCode)}</span>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0 0;font-size:13px;font-weight:600;line-height:1.55;text-align:center;color:#6E5763;">${escapeHtml(validityNote)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 24px 28px;border-top:1px solid #F1DCE3;background-color:#FFFDFE;">
              <p style="margin:0 0 10px 0;font-size:12px;line-height:1.55;text-align:center;color:#7A6470;">${escapeHtml(ignoreNote)}</p>
              <p style="margin:0;font-size:12px;line-height:1.55;text-align:center;color:#7A6470;">
                <a href="${escapeHtml(homeUrl)}" style="color:#9E2450;font-weight:700;text-decoration:none;">scrolly.live</a>
                &nbsp;·&nbsp;
                <a href="${escapeHtml(privacyUrl)}" style="color:#5C4B55;text-decoration:underline;">${escapeHtml(privacyLabel)}</a>
                &nbsp;·&nbsp;
                <a href="${escapeHtml(contactUrl)}" style="color:#5C4B55;text-decoration:underline;">${escapeHtml(contactLabel)}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `Scrolly — ${tagline}`,
    '',
    headline,
    '',
    intro,
    '',
    `${codeLabel}: ${safeCode}`,
    validityNote,
    '',
    ignoreNote,
    '',
    `scrolly.live: ${homeUrl}`,
    `${privacyLabel}: ${privacyUrl}`,
    `${contactLabel}: ${contactUrl}`,
  ].join('\n');

  return postToResend({
    from,
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
