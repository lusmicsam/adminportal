/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/proxy/admin/:path*',
        destination: 'https://ap-9kygkntzn-ujjwal16895s-projects.vercel.app/:path*',
      },
      {
        source: '/api/proxy/student/:path*',
        destination: 'https://ap-q3q62i6z7-ujjwal16895s-projects.vercel.app/:path*',
      },
      {
        source: '/api/proxy/teacher/:path*',
        destination: 'https://ap-a9ztlk738-ujjwal16895s-projects.vercel.app/:path*',
      },
    ];
  },
};

export default nextConfig;
