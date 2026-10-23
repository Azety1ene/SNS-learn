// public/og-image.png（リンクを SNS やチャットに貼ったときのプレビューに出る画像）を作るスクリプト。
// 文字の描画にパソコンのフォントを使うので、日本語フォント（IPAGothic）が入った環境で実行する:
//   node scripts/generate-og-image.mjs
import sharp from "sharp";

// アイコン（src/app/icon.svg）の「S」の形
const iconPath =
  "M20 42c2.5 2.6 6.4 4 10.6 4 5.9 0 9.9-2.9 9.9-7.4 0-4.1-2.8-6-8.6-7.4l-2.6-.6c-3.3-.8-4.5-1.7-4.5-3.3 0-1.9 1.9-3.1 4.8-3.1 2.8 0 5.2 1 7 2.8l3.3-3.9C37.4 20.6 34 19 29.7 19c-5.7 0-9.6 3.1-9.6 7.6 0 4 2.6 6 8.1 7.3l2.7.6c3.6.9 4.9 1.8 4.9 3.5 0 2-2 3.3-5 3.3-3.3 0-6.3-1.3-8.4-3.4z";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0284c7"/>
  <g transform="translate(520 90) scale(2.5)">
    <rect width="64" height="64" rx="14" fill="#ffffff"/>
    <path d="${iconPath}" fill="#0284c7"/>
  </g>
  <text x="600" y="400" text-anchor="middle" font-family="DejaVu Sans" font-weight="bold" font-size="104" fill="#ffffff">SNS-learn</text>
  <text x="600" y="490" text-anchor="middle" font-family="IPAGothic" font-size="42" fill="#e0f2fe">学習のために作っている、テキスト中心の SNS</text>
</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile("public/og-image.png");
console.log("public/og-image.png を作りました");
