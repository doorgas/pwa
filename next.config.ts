import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure external packages for server components
  serverExternalPackages: ['@vercel/blob'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '7wrvwal0c4f2v4r6.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
      // Additional hostname patterns for latest Vercel Blob
      {
        protocol: 'https',
        hostname: 'blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      }
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  webpack: (config, { isServer }) => {
    // Handle node: scheme imports for client-side builds
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        events: false,
        buffer: false,
      };
    }
    return config;
  },
};

export default nextConfig;
