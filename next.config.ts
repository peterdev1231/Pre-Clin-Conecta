import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'iahvbukzioxbjbcxyqrv.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/avataresmedico/**',
      },
    ],
  },
  /* config options here */
};

export default nextConfig;
