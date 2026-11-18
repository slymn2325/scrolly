import {
  buildIndexNowFactUrls as buildIndexNowFactUrlsMjs,
  getConfiguredIndexNowKey as getConfiguredIndexNowKeyMjs,
  getIndexNowKeyLocation as getIndexNowKeyLocationMjs,
  normalizeIndexNowUrlList as normalizeIndexNowUrlListMjs,
  notifyIndexNow as notifyIndexNowMjs,
} from '@/lib/indexNow.mjs';

export interface IndexNowNotifyOptions {
  key?: string;
  timeoutMs?: number;
}

export interface IndexNowNotifyResult {
  ok: boolean;
  skipped: boolean;
  reason: string | null;
  submittedCount: number;
  status: number;
  keyLocation?: string;
  urlList?: string[];
}

export function getConfiguredIndexNowKey(rawKey?: string): string | null {
  return getConfiguredIndexNowKeyMjs(rawKey);
}

export function getIndexNowKeyLocation(key: string): string {
  return getIndexNowKeyLocationMjs(key);
}

export function buildIndexNowFactUrls(slugs: string[]): string[] {
  return buildIndexNowFactUrlsMjs(slugs);
}

export function normalizeIndexNowUrlList(rawUrls: string[]): string[] {
  return normalizeIndexNowUrlListMjs(rawUrls);
}

export async function notifyIndexNow(
  urlsOrSlugs: string[],
  options: IndexNowNotifyOptions = {}
): Promise<IndexNowNotifyResult> {
  return notifyIndexNowMjs(urlsOrSlugs, options);
}
