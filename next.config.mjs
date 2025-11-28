/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [],
  transpilePackages: ['streamdown', 'shiki'],
  images: {
    remotePatterns: [],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
