/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "kr.object.ncloudstorage.com",
      },
      {
        protocol: "https",
        hostname: "dogcatpaw-backend.kr.object.ncloudstorage.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "example.com",
      },
      {
        protocol: "http",
        hostname: "besu-networ-besu-rpc-ext-43e7a-108790139-4b974a576079.kr.lb.naverncp.com",
      },
      {
        protocol: "http",
        hostname: "petdid-netw-dogcatpaw-ap-4d87a-112091686-70fc68edac0a.kr.lb.naverncp.com",
      },
    ],
  },
  webpack: (config) => {
    config.externals.push("pino-pretty", "encoding");
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
    };
    return config;
  },
};

export default nextConfig;
