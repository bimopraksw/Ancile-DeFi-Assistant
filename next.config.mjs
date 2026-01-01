/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Handle wagmi/viem external dependencies
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "porto/internal": false,
    };
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};

export default nextConfig;
