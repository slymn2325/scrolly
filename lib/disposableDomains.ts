const DISPOSABLE_DOMAIN_LIST: readonly string[] = [
  '10minutemail.com',
  '10minutemail.net',
  '10minutemail.org',
  '10minmail.com',
  '20minutemail.com',
  'anonbox.net',
  'armyspy.com',
  'burnermail.io',
  'cool.fr.nf',
  'crazymailing.com',
  'cuvox.de',
  'dayrep.com',
  'discard.email',
  'discardmail.com',
  'discardmail.de',
  'dispostable.com',
  'dropmail.me',
  'einrot.com',
  'emailondeck.com',
  'fakeinbox.com',
  'fakemail.net',
  'filzmail.com',
  'fleckens.hu',
  'getairmail.com',
  'getnada.com',
  'grr.la',
  'guerrillamail.biz',
  'guerrillamail.com',
  'guerrillamail.de',
  'guerrillamail.info',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamailblock.com',
  'gustr.com',
  'harakirimail.com',
  'inboxalias.com',
  'inboxbear.com',
  'incognitomail.org',
  'jetable.fr.nf',
  'jourrapide.com',
  'mailcatch.com',
  'maildrop.cc',
  'mailexpire.com',
  'mailinator.com',
  'mailinator.net',
  'mailinator.org',
  'mailinator2.com',
  'mailnesia.com',
  'mailnull.com',
  'meltmail.com',
  'mintemail.com',
  'minutemail.com',
  'moakt.com',
  'mohmal.com',
  'mytemp.email',
  'nada.email',
  'nospam.ze.tc',
  'owlymail.com',
  'pokemail.net',
  'rhyta.com',
  'sharklasers.com',
  'spam4.me',
  'spambog.com',
  'spambog.de',
  'spambog.ru',
  'spambox.us',
  'spamfree24.org',
  'spamgourmet.com',
  'superrito.com',
  'teleworm.us',
  'temp-mail.io',
  'temp-mail.org',
  'temp-mail.ru',
  'tempail.com',
  'tempinbox.com',
  'tempmail.com',
  'tempmail.de',
  'tempmail.net',
  'tempmail.org',
  'tempmailo.com',
  'tempr.email',
  'throwaway.email',
  'throwawaymail.com',
  'tmpmail.net',
  'tmpmail.org',
  'trash-mail.com',
  'trashmail.com',
  'trashmail.me',
  'trashmail.net',
  'trashmail.org',
  'wegwerfmail.de',
  'wegwerfmail.net',
  'wegwerfmail.org',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
];

export const DISPOSABLE_EMAIL_DOMAINS: ReadonlySet<string> = new Set(DISPOSABLE_DOMAIN_LIST);

const RESERVED_LOCAL_SUFFIXES = ['.localhost', '.local', '.invalid'] as const;

export function extractEmailDomain(emailOrDomain: string): string {
  const cleaned = String(emailOrDomain || '').trim().toLowerCase();
  if (!cleaned) return '';
  const atIdx = cleaned.lastIndexOf('@');
  const rawDomain = atIdx >= 0 ? cleaned.slice(atIdx + 1) : cleaned;
  return rawDomain.replace(/\.+$/, '');
}

export function isDisposableEmailDomain(emailOrDomain: string): boolean {
  const domain = extractEmailDomain(emailOrDomain);
  if (!domain) return false;

  if (domain === 'localhost') return true;
  if (RESERVED_LOCAL_SUFFIXES.some((suffix) => domain.endsWith(suffix))) {
    return true;
  }

  const labels = domain.split('.').filter(Boolean);
  if (labels.length < 2) return true;

  for (let i = 0; i <= labels.length - 2; i += 1) {
    const candidate = labels.slice(i).join('.');
    if (DISPOSABLE_EMAIL_DOMAINS.has(candidate)) {
      return true;
    }
  }

  return false;
}
