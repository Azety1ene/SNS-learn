import Image from "next/image";

type AvatarProps = {
  name: string;
  image: string | null;
  size?: number;
};

/** GitHub のアイコンは URL で大きさを指定できるので、表示サイズに合った小さい画像を取得する */
function sizedImageURL(image: string, size: number): string {
  if (!URL.canParse(image)) return image;
  const url = new URL(image);
  if (url.hostname === "avatars.githubusercontent.com") {
    // 高解像度の画面でもぼやけないよう、表示サイズの 2 倍を取得する
    url.searchParams.set("s", String(size * 2));
  }
  return url.toString();
}

/** アイコン画像。画像がない人は名前の頭文字を表示する */
export function Avatar({ name, image, size = 40 }: AvatarProps) {
  if (!image) {
    return (
      <span
        aria-hidden
        className="flex shrink-0 items-center justify-center rounded-full bg-sky-100 font-bold text-sky-700 dark:bg-sky-900 dark:text-sky-200"
        style={{ width: size, height: size, fontSize: size * 0.45 }}
      >
        {Array.from(name)[0] ?? "?"}
      </span>
    );
  }
  return (
    <Image
      src={sizedImageURL(image, size)}
      alt=""
      width={size}
      height={size}
      // Vercel の画像変換（無料枠は月 5,000 回）を使わず、元の URL のまま表示する
      unoptimized
      className="shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-800"
    />
  );
}
