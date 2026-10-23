import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { BlobNotFoundError, del, put } from "@vercel/blob";
import type { ImagePurpose } from "./image";

/**
 * 画像ファイルの保存先。
 * - 本番・プレビュー（Vercel）: Vercel Blob
 * - ローカル開発・自動テスト: 作業環境のディスク（Vercel 上では使わない）
 */
type FileStorage = {
  put(pathname: string, data: Buffer): Promise<{ url: string }>;
  delete(pathnames: string[]): Promise<void>;
};

/**
 * ファイルの場所の先頭に付ける環境の名前（production / preview / development / local）。
 * Blob の保存場所は本番とプレビューで共通なので、プレビューで投稿を消したときに
 * 本番の画像まで消してしまわないよう、「自分の環境の画像だけを消す」ために使う
 */
const STORAGE_ENV = process.env.VERCEL_ENV ?? "local";

const blobStorage: FileStorage = {
  async put(pathname, data) {
    const blob = await put(pathname, data, {
      access: "public",
      contentType: "image/webp",
      // ファイルの場所は毎回ランダムに決めるので、同じ URL の中身が変わることはない。
      // ブラウザや CDN に 1 年間保存させて、Blob からの読み出し（無料枠の回数）を減らす
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });
    return { url: blob.url };
  },
  async delete(pathnames) {
    // 削除は無料枠の回数に数えられない
    try {
      await del(pathnames);
    } catch (error) {
      if (!(error instanceof BlobNotFoundError)) throw error;
      // まとめて消そうとして「見つからない」と言われたときは、1 つずつ消し直す。
      // すでに消えているファイルは、消せたものとして扱う（同じ削除を 2 回行っても大丈夫にする）
      for (const pathname of pathnames) {
        await del(pathname).catch((retryError: unknown) => {
          if (!(retryError instanceof BlobNotFoundError)) throw retryError;
        });
      }
    }
  },
};

/** 保存したファイルを配信する URL の先頭（src/app/local-media/[...path]/route.ts が返す） */
const LOCAL_MEDIA_URL_PREFIX = "/local-media/";

// ディスクへの保存は Vercel 上では使わない。ビルド時に「どのファイルを読み書きするか」を調べて
// プロジェクト全体をサーバーに同梱してしまわないよう、turbopackIgnore の印を付けている
function localFilePath(pathname: string): string {
  const dir = process.env.LOCAL_STORAGE_DIR ?? path.join(process.cwd(), ".local-storage");
  return path.join(/* turbopackIgnore: true */ dir, pathname);
}

const diskStorage: FileStorage = {
  async put(pathname, data) {
    const file = localFilePath(pathname);
    await mkdir(/* turbopackIgnore: true */ path.dirname(file), { recursive: true });
    await writeFile(/* turbopackIgnore: true */ file, data);
    return { url: `${LOCAL_MEDIA_URL_PREFIX}${pathname}` };
  },
  async delete(pathnames) {
    await Promise.all(
      pathnames.map((pathname) =>
        rm(/* turbopackIgnore: true */ localFilePath(pathname), { force: true }),
      ),
    );
  },
};

function usesBlob(): boolean {
  // Vercel で Blob ストアをプロジェクトに接続すると、これらの環境変数が自動で設定される
  return Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
}

function getStorage(): FileStorage {
  if (usesBlob()) return blobStorage;
  // Vercel のサーバーのディスクは一時的なもので、保存したファイルはすぐ消えてしまう。
  // 設定漏れに気づけるよう、ディスクには保存せずエラーにする
  if (process.env.VERCEL) {
    throw new Error("Vercel Blob が接続されていません（docs/deploy.md の「画像の保存先」を参照）");
  }
  return diskStorage;
}

/** 新しいファイルの場所を決める（例: production/post/0b6c5c1e-....webp）。推測できないようランダムにする */
export function newPathname(purpose: ImagePurpose): string {
  return `${STORAGE_ENV}/${purpose}/${randomUUID()}.webp`;
}

/** ファイルを保存し、表示用の URL を返す */
export async function saveFile(pathname: string, data: Buffer): Promise<{ url: string }> {
  return getStorage().put(pathname, data);
}

/** ファイルを消す。ほかの環境（本番から見たプレビューなど）のファイルには手を付けない */
export async function deleteFiles(pathnames: string[]): Promise<void> {
  const own = pathnames.filter((pathname) => pathname.startsWith(`${STORAGE_ENV}/`));
  if (own.length > 0) await getStorage().delete(own);
}

// ローカルのファイルの場所として受け付ける形（例: local/post/<UUID>.webp）。
// URL から受け取った値でディスクを読むので、「../」などで別の場所を読まれないよう厳しく確かめる
const LOCAL_PATHNAME_PATTERN = /^[a-z]+\/(post|avatar)\/[0-9a-f-]{36}\.webp$/;

/** ローカルに保存したファイルを読む（開発と自動テスト用）。Blob を使う環境や、形の違う場所なら null */
export async function readLocalFile(pathname: string): Promise<Buffer | null> {
  if (usesBlob() || process.env.VERCEL || !LOCAL_PATHNAME_PATTERN.test(pathname)) return null;
  try {
    return await readFile(/* turbopackIgnore: true */ localFilePath(pathname));
  } catch {
    return null;
  }
}
