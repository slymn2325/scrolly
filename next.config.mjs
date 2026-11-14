/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.scrolly.live',
          },
        ],
        destination: 'https://scrolly.live/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
