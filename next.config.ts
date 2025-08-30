
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'down-id.img.susercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cf.shopee.co.id',
        port: '',
        pathname: '/**',
      }
    ],
  },
  serverActions: {
    bodySizeLimit: '4.5mb',
    // Extend the server action timeout for long-running operations
    // such as bulk data imports. The default is 60s.
    executionTimeout: 120,
  }
};

export default nextConfig;
