import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 启用压缩
  compress: true,
  
  // 优化图片加载
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  
  // 添加响应头以改善缓存
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
