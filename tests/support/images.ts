import { readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

type TestJpegOptions = {
  width?: number;
  height?: number;
  /** 撮影場所（GPS）の情報を付ける */
  withGps?: boolean;
  /** 写真の向き（Exif の Orientation。6 は「右に 90 度回して表示する」） */
  orientation?: number;
};

/** テスト用の JPEG 画像を作る */
export async function createTestJpeg(options: TestJpegOptions = {}): Promise<Buffer> {
  const { width = 300, height = 200, withGps = false, orientation } = options;
  let image = sharp({
    create: { width, height, channels: 3, background: { r: 30, g: 120, b: 200 } },
  }).jpeg();
  if (withGps) {
    // IFD3 は GPS 情報の入る場所（35°40′N）
    image = image.withExif({ IFD3: { GPSLatitudeRef: "N", GPSLatitude: "35/1 40/1 0/1" } });
  }
  if (orientation) image = image.withMetadata({ orientation });
  return image.toBuffer();
}

/** ブラウザから送られてくるのと同じ形の画像ファイルを作る */
export async function createTestImageFile(options: TestJpegOptions = {}): Promise<File> {
  const data = await createTestJpeg(options);
  return new File([new Uint8Array(data)], "photo.jpg", { type: "image/jpeg" });
}

/** Exif の中に GPS 情報（GPS の場所を指すタグ 0x8825）があるか */
export function hasGpsInfo(exif: Buffer | undefined): boolean {
  if (!exif) return false;
  return exif.includes(Buffer.from([0x25, 0x88])) || exif.includes(Buffer.from([0x88, 0x25]));
}

/** テストで画像を保存するフォルダ（vitest.config.mts の LOCAL_STORAGE_DIR） */
export function storageDir(): string {
  return process.env.LOCAL_STORAGE_DIR!;
}

/** /local-media/... の URL や、local/post/... の場所から、保存されたファイルのパスを求める */
export function storedFilePath(urlOrPathname: string): string {
  return path.join(storageDir(), urlOrPathname.replace(/^\/local-media\//, ""));
}

/** 保存されているファイルの数（フォルダがなければ 0） */
export async function countStoredFiles(): Promise<number> {
  const entries = await readdir(storageDir(), { recursive: true, withFileTypes: true }).catch(
    () => [],
  );
  return entries.filter((entry) => entry.isFile()).length;
}
