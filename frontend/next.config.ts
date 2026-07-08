import "./instrument.mjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [],
  turbopack: {},
  webpack: (config, { dev, isServer }) => {
    // 🚀 تطبيق التشفير (Obfuscation) في وضع الإنتاج ولجهة العميل فقط
    if (!dev && !isServer) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const WebpackObfuscator = require('webpack-obfuscator');
      
      config.plugins.push(
        new WebpackObfuscator({
          controlFlowFlattening: true,
          deadCodeInjection: true,
          stringArray: true,
          stringArrayEncoding: ['base64'],
          disableConsoleOutput: true,
        }, [
          // 🚀 استثناء جميع ملفات الموقع من التشفير للحفاظ على الأداء
          '**/*',
          // 🚀 إلغاء الاستثناء لملف مشغل الفيديو فقط (تطبيق التشفير عليه)
          '!**/components/SecureVideoPlayer*'
        ])
      );
    }
    return config;
  },
};

export default nextConfig;
