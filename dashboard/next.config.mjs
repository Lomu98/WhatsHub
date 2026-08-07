/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // La dashboard è interamente client-side (listener realtime su Firebase):
  // nessuna server action, nessun segreto lato server. Per questo può essere
  // esportata come sito statico e servita da Firebase Hosting senza bisogno
  // di Cloud Functions/Cloud Run.
  output: 'export',
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
