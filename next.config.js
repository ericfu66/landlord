/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 15: serverComponentsExternalPackages 已移至顶层
  serverExternalPackages: ['sql.js'],
  
  // 图片优化配置 - 使用现代格式和合适尺寸
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24, // 24小时缓存
  },
  
  // 启用 gzip 压缩
  compress: true,
  
  // 实验性功能优化
  experimental: {
    // 优化包导入 - 减少大型库的打包大小
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'zod',
    ],
    // 启用 React Compiler 优化
    reactCompiler: true,
  },
  
  // 构建输出配置 - 独立输出模式便于部署
  output: 'standalone',
  
  // 自定义 HTTP 响应头 - 优化缓存策略
  async headers() {
    return [
      {
        // 静态资源长期缓存
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // API 路由禁用缓存
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ]
  },
  
  // Webpack 配置
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      }
    }
    
    // 优化：分割大chunk
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // 将大型第三方库单独打包
          vendor: {
            test: /[\\/]node_modules[\\/](framer-motion|lucide-react)[\\/]/,
            name: 'vendor',
            priority: 10,
            reuseExistingChunk: true,
          },
          // 默认chunk
          default: {
            minChunks: 2,
            priority: -10,
            reuseExistingChunk: true,
          },
        },
      }
    }
    
    return config
  },
}

module.exports = nextConfig
