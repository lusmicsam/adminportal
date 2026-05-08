/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
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
        source: '/api/proxy/admin/api/university/admin/analytics/sub-unit-details',
        destination: 'https://ap-is-seven.vercel.app/api/university/admin/analytics/sub-unit-details',
      },
      {
        source: '/api/proxy/admin/api/auth/teacher/teacher/analytics/unit-completion',
        destination: 'https://ap-is-seven.vercel.app/api/auth/teacher/teacher/analytics/unit-completion',
      },
      {
        source: '/api/proxy/admin/api/auth/teacher/teacher/analytics/section-completion',
        destination: 'https://ap-is-seven.vercel.app/api/auth/teacher/teacher/analytics/section-completion',
      },
      {
        source: '/api/proxy/admin/api/auth/teacher/teacher/analytics/section-exam-progress',
        destination: 'https://ap-is-seven.vercel.app/api/auth/teacher/teacher/analytics/section-exam-progress',
      },
      {
        source: '/api/proxy/admin/api/university/admin/get-sections-by-batch',
        destination: 'https://ap-is-seven.vercel.app/api/university/admin/get-sections-by-batch',
      },
      {
        source: '/api/proxy/admin/api/university/admin/get-practice-courses-by-batch',
        destination: 'https://ap-is-seven.vercel.app/api/university/admin/get-practice-courses-by-batch',
      },
      {
        source: '/api/proxy/admin/api/university/admin/get-exam-courses-by-batch',
        destination: 'https://ap-is-seven.vercel.app/api/university/admin/get-exam-courses-by-batch',
      },
      {
        source: '/api/proxy/admin/:path*',
        destination: 'https://ap-is-seven.vercel.app/:path*',
      },
      {
        source: '/api/proxy/student/:path*',
        destination: 'https://ap-is-seven.vercel.app/:path*',
      },
      {
        source: '/api/proxy/teacher/:path*',
        destination: 'https://ap-is-seven.vercel.app/:path*',
      },
    ];
  },
};

export default nextConfig;
