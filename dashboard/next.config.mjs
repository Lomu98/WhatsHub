/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // La dashboard è interamente client-side (listener realtime su Firebase):
  // nessuna server action, nessun segreto lato server.
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
