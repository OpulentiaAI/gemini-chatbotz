const path = require('path');

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
  // Fix Turbopack root directory detection for workspaces with multiple lockfiles
  turbopack: {
    root: path.resolve(__dirname),
  },
};

