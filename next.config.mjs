/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/proxy/admin/api/university/admin/section-analytics/:path*',
        destination: 'https://ap-is-seven.vercel.app/api/university/admin/section-analytics/:path*',
      },
      {
        source: '/api/proxy/admin/api/university/admin/my-teachers',
        destination: 'https://ap-is-seven.vercel.app/api/university/admin/my-teachers',
      },
      {
        source: '/api/proxy/admin/api/university/admin/course-structure/:path*',
        destination: 'https://ap-is-seven.vercel.app/api/university/admin/course-structure/:path*',
      },
      {
        source: '/api/proxy/admin/:path*',
        destination: 'https://ap-3fqqyqoo8-ujjwal16895s-projects.vercel.app/:path*',
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
