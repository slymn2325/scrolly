import { NextResponse } from 'next/server';
import { canonicalizeEmail } from '@/lib/auth';
import { ensureSchema, getPool, hasDatabaseUrl } from '@/lib/db';
import { getContactRecipientEmail, sendContactEmail } from '@/lib/mailer';
import { sanitizeDisplayText, stripControlCharsKeepNewlines } from '@/lib/originPolicy';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';
import { enforceSameOrigin, readJsonBodyWithLimit } from '@/lib/requestSecurity';

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
  const originErr = enforceSameOrigin(request);
  if (originErr) return originErr;

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

  const parsed = await readJsonBodyWithLimit<ContactPayload>(request, 16 * 1024);
  if (!parsed.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: parsed.status === 413 ? 'Contact payload too large.' : 'Invalid JSON request body.',
      },
      { status: parsed.status, headers: NO_STORE_HEADERS }
    );
  }
  const body = parsed.data;

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
  const rawEmailInput = typeof body.email === 'string' ? body.email : '';
  if (/[\r\n\0]/.test(rawEmailInput)) {
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

  const name = sanitizeDisplayText(body.name, 120);
  const email = rawEmailInput.trim().toLowerCase().slice(0, 180);
  const rawSubject = sanitizeDisplayText(body.subject, 120);
  const message = stripControlCharsKeepNewlines(body.message, 4000);

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

  const canonicalEmail = canonicalizeEmail(email);
  const emailLimit = checkRateLimit(`contact_email:${canonicalEmail}`, 3, 10 * 60_000);
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

  const globalLimit = checkRateLimit('contact_global', 30, 10 * 60_000);
  if (!globalLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error:
          lang === 'en'
            ? 'Contact service is temporarily busy. Please try again shortly.'
            : 'İletişim servisi şu anda yoğun. Lütfen birkaç dakika sonra tekrar deneyin.',
      },
      {
        status: 429,
        headers: { ...NO_STORE_HEADERS, 'Retry-After': String(globalLimit.retryAfterSec) },
      }
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

  try {
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

    return NextResponse.json(
      {
        ok: true,
        recipient,
        subject,
      },
      { status: 200, headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    console.error('[POST /api/contact] Unexpected contact delivery error:', err);
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
}
