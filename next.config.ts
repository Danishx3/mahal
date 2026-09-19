import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/admin/marriage-certificate',
        destination: '/admin/marriage-certificates',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
