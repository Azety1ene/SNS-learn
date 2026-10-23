import "server-only";
import sharp from "sharp";
import { UserFacingError } from "@/lib/errors";

export type ImagePurpose = "post" | "avatar";

export type ProcessedImage = {
  data: Buffer;
  width: number;
  height: number;
  sizeBytes: number;
};

// 受け付ける画像の形式。ファイル名や Content-Type は送る側がいくらでも偽れるので、
// sharp がファイルの中身（先頭のバイト列）から判定した形式で確かめる
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp"]);

// 縦×横のピクセル数の上限。小さなファイルに巨大な画像を詰め込み、
// 展開したときにメモリを使い果たさせる攻撃（画像爆弾）を防ぐ
const MAX_INPUT_PIXELS = 25_000_000;

/** 投稿の画像の長辺の上限 */
const POST_IMAGE_MAX_EDGE = 1600;
/** アイコンの大きさ（正方形） */
const AVATAR_SIZE = 400;

/**
 * アップロードされた画像を、保存してよい形に作り直す。
 * - 中身が JPEG・PNG・WebP の画像であることを確かめる
 * - スマホで撮った写真の向き（Exif の Orientation）を、実際の画素の向きに反映する
 * - 投稿の画像は長辺 1600px 以内、アイコンは 400px の正方形にする
 * - WebP に変換する。このとき撮影場所（GPS）などのメタデータはすべて取り除かれる
 *   （sharp は、withMetadata() などを呼ばない限りメタデータを書き出さない）
 */
export async function processImage(
  input: Buffer,
  purpose: ImagePurpose,
): Promise<ProcessedImage> {
  // 画素を展開する前に、ファイルの先頭にある情報（形式・縦横の大きさ）だけを読んで確かめる
  const metadata = await sharp(input).metadata().catch(() => null);
  if (!metadata) throw new UserFacingError("画像を読み込めませんでした");
  if (!ACCEPTED_FORMATS.has(metadata.format)) {
    throw new UserFacingError("JPEG・PNG・WebP の画像を選んでください");
  }
  if (metadata.width * metadata.height > MAX_INPUT_PIXELS) {
    throw new UserFacingError("画像の縦横の大きさが大きすぎます");
  }

  // 念のため、展開するときにも同じ上限をかけておく
  const image = sharp(input, { autoOrient: true, limitInputPixels: MAX_INPUT_PIXELS });
  const resized =
    purpose === "avatar"
      ? // 中央を正方形に切り抜く
        image.resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover" })
      : // 縦横比はそのままで、長辺が上限を超えるときだけ縮小する
        image.resize(POST_IMAGE_MAX_EDGE, POST_IMAGE_MAX_EDGE, {
          fit: "inside",
          withoutEnlargement: true,
        });

  try {
    const { data, info } = await resized
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height, sizeBytes: info.size };
  } catch {
    // 途中までしかないファイルや、壊れたファイルの場合
    throw new UserFacingError("画像を読み込めませんでした");
  }
}
