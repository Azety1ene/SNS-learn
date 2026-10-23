// ブラウザの中で画像を縮小する（Client Components から使う）。
// スマホの写真は 1 枚 3〜10MB あり、そのまま送るとサーバーが受け取れる大きさ（1 枚 1MB）を超えるため、
// 送る前に縮小して JPEG にする。仕上げ（WebP への変換やメタデータの除去）はサーバーで行う。

import { MAX_UPLOAD_BYTES } from "./validation";

export type PreparedImage = {
  /** 送るファイル（縮小した JPEG） */
  file: File;
  /** 画面に表示する小さなプレビュー（data: URL） */
  previewUrl: string;
};

/** 投稿の画像: 長辺 1600px まで */
export const POST_IMAGE_RESIZE = { maxEdge: 1600 };
/** アイコン: 長辺 800px まで（サーバーで 400px の正方形に切り抜く） */
export const AVATAR_RESIZE = { maxEdge: 800 };

// 少し余裕を持たせて、サーバーの上限（1MB）より小さくする
const TARGET_BYTES = MAX_UPLOAD_BYTES * 0.9;
// 画質を少しずつ下げて、目標の大きさに収まるまで試す
const JPEG_QUALITIES = [0.85, 0.75, 0.6];
const PREVIEW_EDGE = 160;

export async function prepareImage(
  file: File,
  options: { maxEdge: number },
): Promise<PreparedImage> {
  const image = await loadImage(file);
  const { width, height } = fitWithin(image.naturalWidth, image.naturalHeight, options.maxEdge);

  // <canvas> に描いてから書き出すと、撮影場所（GPS）などのメタデータは付かない。
  // 写真の向き（Exif の Orientation）は、ブラウザが読み込むときに反映してくれる
  const canvas = drawToCanvas(image, width, height);
  for (const quality of JPEG_QUALITIES) {
    const blob = await toJpegBlob(canvas, quality);
    if (blob.size <= TARGET_BYTES) {
      const preview = fitWithin(width, height, PREVIEW_EDGE);
      return {
        file: new File([blob], "image.jpg", { type: "image/jpeg" }),
        previewUrl: drawToCanvas(image, preview.width, preview.height).toDataURL("image/jpeg", 0.7),
      };
    }
  }
  throw new Error("画像を小さくできませんでした。別の画像を選んでください");
}

/** 縦横比を保ったまま、長辺が maxEdge 以下になる大きさを求める（拡大はしない） */
function fitWithin(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      // このブラウザで表示できない形式（パソコンの Chrome での HEIC など）や、壊れたファイル
      reject(new Error("この画像は読み込めませんでした。JPEG・PNG・WebP の画像を選んでください"));
    };
    image.src = url;
  });
}

function drawToCanvas(image: HTMLImageElement, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("画像を処理できませんでした");
  // JPEG は透明を表せないので、透明な部分は白にする
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas;
}

function toJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("画像を処理できませんでした"))),
      "image/jpeg",
      quality,
    );
  });
}
