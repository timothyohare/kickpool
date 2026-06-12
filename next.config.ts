import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bake API keys into the server bundle at build time.
  // Amplify Gen 1 SSR passes env vars to the build process but not always
  // to the Lambda runtime, so we capture them here. These are server-only
  // routes — the values never reach the client bundle.
  env: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
    TAVILY_API_KEY: process.env.TAVILY_API_KEY ?? '',
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'a.espncdn.com' },
      { protocol: 'https', hostname: 'flagcdn.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
    ],
  },
};

export default nextConfig;
