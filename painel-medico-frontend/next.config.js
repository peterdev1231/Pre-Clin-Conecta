// import type { NextConfig } from "next"; // Comentado ou removido

const nextConfig = { // Removida a tipagem : NextConfig
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

export default nextConfig; // Mantido como export default, Next.js 14 deve lidar bem. 