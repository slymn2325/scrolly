import { NextResponse } from 'next/server';
import { ensureSchema, getPool, hasDatabaseUrl } from '@/lib/db';
import { getContactRecipientEmail, sendContactEmail } from '@/lib/mailer';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

const ALLOWED_SUBJECTS = new Set([
  'Genel Soru',
  'Bilimsel Kaynak Düzeltmesi',
  'Reklam & İş Birliği',
  'Teknik Destek',
  'General Inquiry',
  'Scientific Source Correction',
  'Advertising & Partnership',
  'Technical Support',
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface ContactPayload {
  name?: unknown;
  email?: unknown;
  subject?: unknown;
  message?: unknown;
  lang?: unknown;
  website?: unknown;
  company?: unknown;
}

export async function POST(request: Request) {
  const clientIp = extractClientIp(request);
  const ipLimit = checkRateLimit(`contact_ip:${clientIp}`, 5, 10 * 60_000);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many contact submissions. Please wait a few minutes.' },
      {
        status: 429,
        headers: { ...NO_STORE_HEADERS, 'Retry-After': String(ipLimit.retryAfterSec) },
      }
    );
  }

  let body: ContactPayload;
  try {
    body = (await request.json()) as ContactPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON request body.' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const honeypotValue =
    typeof body.website === 'string'
      ? body.website.trim()
      : typeof body.company === 'string'
        ? body.company.trim()
        : '';

  if (honeypotValue.length > 0) {
    return NextResponse.json(
      { ok: false, error: 'Invalid submission.' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const lang = body.lang === 'en' ? 'en' : 'tr';
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 180) : '';
  const rawSubject = typeof body.subject === 'string' ? body.subject.trim().slice(0, 120) : '';
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 4000) : '';

  if (name.length < 2) {
    return NextResponse.json(
      {
        ok: false,
        error: lang === 'en' ? 'Please enter your name.' : 'Lütfen adınızı ve soyadınızı girin.',
      },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          lang === 'en'
            ? 'Please enter a valid email address.'
            : 'Lütfen geçerli bir e-posta adresi girin.',
      },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const emailLimit = checkRateLimit(`contact_email:${email}`, 3, 10 * 60_000);
  if (!emailLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error:
          lang === 'en'
            ? 'Too many messages sent from this email. Please wait a few minutes.'
            : 'Bu e-posta adresinden çok fazla mesaj gönderildi. Lütfen birkaç dakika bekleyin.',
      },
      {
        status: 429,
        headers: { ...NO_STORE_HEADERS, 'Retry-After': String(emailLimit.retryAfterSec) },
      }
    );
  }

  const subject = ALLOWED_SUBJECTS.has(rawSubject)
    ? rawSubject
    : lang === 'en'
      ? 'General Inquiry'
      : 'Genel Soru';

  if (message.length < 5) {
    return NextResponse.json(
      {
        ok: false,
        error:
          lang === 'en'
            ? 'Please enter a message of at least 5 characters.'
            : 'Lütfen en az 5 karakterlik bir mesaj yazın.',
      },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const recipient = getContactRecipientEmail();
  let persisted = false;

  if (hasDatabaseUrl()) {
    try {
      await ensureSchema();
      const pool = getPool();
      await pool.query(
        `INSERT INTO contact_messages (name, email, subject, message, lang)
         VALUES ($1, $2, $3, $4, $5)`,
        [name, email, subject, message, lang]
      );
      persisted = true;
    } catch (err) {
      console.error('[POST /api/contact] Failed to persist contact message in Postgres:', err);
    }
  }

  const mailResult = await sendContactEmail({
    name,
    email,
    subject,
    message,
    lang,
  });

  if (!mailResult.ok && !persisted) {
    return NextResponse.json(
      {
        ok: false,
        error:
          lang === 'en'
            ? `Message could not be delivered right now. Please write directly to ${recipient}.`
            : `Mesajınız şu anda iletilemedi. Lütfen doğrudan ${recipient} adresine yazın.`,
      },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  const mode = persisted
    ? mailResult.ok && mailResult.delivery === 'resend'
      ? 'postgres+resend'
      : 'postgres'
    : mailResult.delivery === 'resend'
      ? 'resend'
      : 'dev_simulation';

  return NextResponse.json(
    {
      ok: true,
      recipient,
      mode,
      persisted,
      emailDelivered: mailResult.ok && mailResult.delivery === 'resend',
      subject,
    },
    { status: 200, headers: NO_STORE_HEADERS }
  );
}
