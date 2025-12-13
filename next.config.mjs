/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/api/proxy/:path*",
        destination: "https://ap-roh7jt8ue-ujjwal16895s-projects.vercel.app/api/:path*",
      },
    ];
  },
};

export default nextConfig;
