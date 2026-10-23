import { readLocalFile } from "@/features/media/storage";

/**
 * ローカル開発と自動テストで、ディスクに保存した画像を配信する。
 * 本番・プレビューの画像は Vercel Blob から直接配信されるので、Vercel 上では常に 404 を返す
 */
export async function GET(_request: Request, context: RouteContext<"/local-media/[...path]">) {
  const { path } = await context.params;
  const file = await readLocalFile(path.join("/"));
  if (!file) return new Response("Not Found", { status: 404 });

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "image/webp",
      // ファイルの場所は毎回ランダムに決めるので、中身は変わらない
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
