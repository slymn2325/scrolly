import { NextResponse } from 'next/server';
import { ensureSchema, getPool, hasDatabaseUrl } from '@/lib/db';

export const dynamic = 'force-dynamic';

const OFFICIAL_CONTACT_EMAIL = 'contact@scrolly.live';

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
}

export async function POST(request: Request) {
  let body: ContactPayload;
  try {
    body = (await request.json()) as ContactPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON request body.' },
      { status: 400 }
    );
  }

  const lang = body.lang === 'en' ? 'en' : 'tr';
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
  const email = typeof body.email === 'string' ? body.email.trim().slice(0, 180) : '';
  const rawSubject = typeof body.subject === 'string' ? body.subject.trim().slice(0, 120) : '';
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 4000) : '';

  if (name.length < 2) {
    return NextResponse.json(
      {
        ok: false,
        error: lang === 'en' ? 'Please enter your name.' : 'Lütfen adınızı ve soyadınızı girin.',
      },
      { status: 400 }
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
      { status: 400 }
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
      { status: 400 }
    );
  }

  let persistedMode: 'postgres' | 'acknowledged' = 'acknowledged';

  if (hasDatabaseUrl()) {
    try {
      await ensureSchema();
      const pool = getPool();
      await pool.query(
        `INSERT INTO contact_messages (name, email, subject, message, lang)
         VALUES ($1, $2, $3, $4, $5)`,
        [name, email, subject, message, lang]
      );
      persistedMode = 'postgres';
    } catch (err) {
      console.error('[POST /api/contact] Failed to persist contact message:', err);
      persistedMode = 'acknowledged';
    }
  }

  return NextResponse.json({
    ok: true,
    recipient: OFFICIAL_CONTACT_EMAIL,
    mode: persistedMode,
    subject,
  });
}
