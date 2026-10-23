import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // レスポンスに「Next.js で作られている」という情報を付けない（攻撃者への手がかりを減らす）
  poweredByHeader: false,
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
