import Image from "next/image";
import type { PostImage } from "../types";

// 画像は保存するときに WebP・適切な大きさへ変換済みなので、Vercel の画像変換
// （無料枠は月 5,000 回）は使わず、保存先の URL のまま表示する（unoptimized）

/** 投稿の画像（1〜4 枚）。タップすると元の大きさの画像を開く */
export function PostImages({ images }: { images: PostImage[] }) {
  if (images.length === 0) return null;

  if (images.length === 1) {
    const [image] = images;
    return (
      <a
        href={image.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 block overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800"
      >
        <Image
          src={image.url}
          alt={image.alt || "画像"}
          width={image.width}
          height={image.height}
          unoptimized
          className="max-h-[32rem] w-full bg-zinc-100 object-cover dark:bg-zinc-900"
        />
      </a>
    );
  }

  // 2〜4 枚は、横長の枠の中に並べる（3 枚のときは 1 枚目を左に大きく表示する）
  return (
    <div
      className={`mt-2 grid aspect-[16/9] grid-cols-2 gap-0.5 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 ${
        images.length > 2 ? "grid-rows-2" : ""
      }`}
    >
      {images.map((image, index) => (
        <a
          key={image.url}
          href={image.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`relative block min-h-0 ${images.length === 3 && index === 0 ? "row-span-2" : ""}`}
        >
          <Image
            src={image.url}
            alt={image.alt || `画像 ${index + 1}`}
            fill
            sizes="(max-width: 576px) 50vw, 288px"
            unoptimized
            className="bg-zinc-100 object-cover dark:bg-zinc-900"
          />
        </a>
      ))}
    </div>
  );
}
