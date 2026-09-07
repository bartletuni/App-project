/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        // The public pricing form moved from /quote to /estimate when the two
        // became different things: an estimate is what anyone can ask for, and
        // a quote is a price we only give an account holder who has sent us the
        // part file. Permanent, because the old URL is in emails, search
        // results and whatever anyone bookmarked.
        source: '/quote',
        destination: '/estimate',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
