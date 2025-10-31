/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  // Production 빌드 최적화 (메모리 사용 감소)
  productionBrowserSourceMaps: false,

  // SWC Minifier 최적화
  swcMinify: true,

  // 실험적 기능 - 메모리 최적화
  experimental: {
    // 빌드 시 메모리 사용 줄이기
    optimizePackageImports: ['@rainbow-me/rainbowkit', 'wagmi', 'viem'],
  },

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
