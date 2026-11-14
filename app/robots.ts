import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: [
          '*',
          'Googlebot',
          'Bingbot',
          'Mediapartners-Google',
          'AdsBot-Google',
          'GPTBot',
          'OAI-SearchBot',
          'PerplexityBot',
          'ClaudeBot',
          'Google-Extended',
        ],
        allow: ['/', '/fact/', '/category/', '/llms.txt', '/llms-full.txt'],
        disallow: ['/api/'],
      },
    ],
    sitemap: 'https://scrolly.live/sitemap.xml',
    host: 'https://scrolly.live',
  };
}
