import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // レスポンスに「Next.js で作られている」という情報を付けない（攻撃者への手がかりを減らす）
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Server Actions で受け取れるデータの大きさの上限（初期値は 1MB）。画像 4 枚（1 枚 1MB まで）を送れるようにする。
      // Vercel の関数が受け取れる上限（4.5MB）より小さくしておく
      bodySizeLimit: "4mb",
    },
  },
  images: {
    // 外部の画像は、許可した場所のものだけを表示する（GitHub のアイコン）
    remotePatterns: [new URL("https://avatars.githubusercontent.com/**")],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        // すべてのページに付ける、ブラウザ向けの安全設定
        source: "/(.*)",
        headers: [
          // 他のサイトの中に埋め込まれて、だまし操作に使われるのを防ぐ
          { key: "X-Frame-Options", value: "DENY" },
          // ファイルの種類をブラウザに推測させない
          { key: "X-Content-Type-Options", value: "nosniff" },
          // 他のサイトへ移動するときに、URL の詳しい部分を渡さない
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // 使わない端末の機能（カメラなど）を無効にする
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
