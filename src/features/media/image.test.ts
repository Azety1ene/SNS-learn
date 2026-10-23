import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { createTestJpeg, hasGpsInfo } from "../../../tests/support/images";
import { processImage } from "./image";

describe("processImage", () => {
  it("WebP に変換し、撮影場所（GPS）などのメタデータを取り除く", async () => {
    const input = await createTestJpeg({ withGps: true });
    // 元の画像には GPS 情報が入っている
    expect(hasGpsInfo((await sharp(input).metadata()).exif)).toBe(true);

    const output = await processImage(input, "post");
    const metadata = await sharp(output.data).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.exif).toBeUndefined();
    expect(output.sizeBytes).toBe(output.data.length);
  });

  it("写真の向き（Exif の Orientation）を、画素の向きに反映する", async () => {
    // 横 300 × 縦 200 で保存され、「右に 90 度回して表示する」という情報が付いた写真
    const input = await createTestJpeg({ width: 300, height: 200, orientation: 6 });

    const output = await processImage(input, "post");
    expect([output.width, output.height]).toEqual([200, 300]);
  });

  it("投稿の画像は長辺を 1600px までに縮小し、縦横比は保つ", async () => {
    const output = await processImage(await createTestJpeg({ width: 3000, height: 1500 }), "post");
    expect([output.width, output.height]).toEqual([1600, 800]);
  });

  it("小さい画像は拡大しない", async () => {
    const output = await processImage(await createTestJpeg({ width: 300, height: 200 }), "post");
    expect([output.width, output.height]).toEqual([300, 200]);
  });

  it("アイコンは 400px の正方形に切り抜く", async () => {
    const output = await processImage(await createTestJpeg({ width: 900, height: 600 }), "avatar");
    expect([output.width, output.height]).toEqual([400, 400]);
  });

  it("画像ではないファイルは受け付けない", async () => {
    await expect(processImage(Buffer.from("<script>alert(1)</script>"), "post")).rejects.toThrow(
      "画像を読み込めませんでした",
    );
  });

  it("JPEG・PNG・WebP 以外の画像（SVG など）は受け付けない", async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
    );
    await expect(processImage(svg, "post")).rejects.toThrow("JPEG・PNG・WebP の画像を選んでください");
  });

  it("縦横のピクセル数が大きすぎる画像（画像爆弾）は、展開する前に断る", async () => {
    // 1 色だけの画像は、6000×5000（3,000 万ピクセル）でもファイルはとても小さくなる
    const bomb = await sharp({
      create: { width: 6000, height: 5000, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    expect(bomb.length).toBeLessThan(200_000);
    await expect(processImage(bomb, "post")).rejects.toThrow("画像の縦横の大きさが大きすぎます");
  });

  it("途中で切れている画像は受け付けない", async () => {
    const input = await createTestJpeg({ width: 800, height: 600 });
    const truncated = input.subarray(0, Math.floor(input.length / 2));
    await expect(processImage(truncated, "post")).rejects.toThrow("画像を読み込めませんでした");
  });
});
