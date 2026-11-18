import type { MetadataRoute } from 'next';

const AI_AND_SEARCH_BOTS = [
  'Googlebot',
  'Applebot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'PerplexityBot',
  'ClaudeBot',
  'Bingbot',
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...AI_AND_SEARCH_BOTS.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: '/api/',
      })),
      {
        userAgent: '*',
        allow: '/',
        disallow: '/api/',
      },
    ],
    sitemap: 'https://scrolly.live/sitemap.xml',
  };
}
