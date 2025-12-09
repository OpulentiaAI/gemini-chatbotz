/** @type {import('next').NextConfig} */
module.exports = {
  serverExternalPackages: [],
  transpilePackages: ['streamdown', 'shiki'],
  images: {
    remotePatterns: [],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Explicit build id to avoid generateBuildId undefined issues
  generateBuildId: async () => `build-${Date.now()}`,
};

