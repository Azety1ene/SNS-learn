import "server-only";
import { and, eq, inArray, isNotNull, isNull, lt, notExists, or, sql } from "drizzle-orm";
import { db, type Transaction } from "@/db";
import { media, postMedia, users } from "@/db/schema";
import { UserFacingError } from "@/lib/errors";
import { type ImagePurpose, processImage } from "./image";
import { deleteFiles, newPathname, saveFile } from "./storage";

// 無料枠（Vercel Blob: 保存 1GB、アップロードは月 2,000 回）を超えないための上限。
// 無料枠の 8 割で止めて余裕を残す（docs/requirements.md の 6 章）
/** 1 人が 24 時間にアップロードできる枚数 */
export const USER_UPLOADS_PER_DAY = 10;
/** サービス全体で、直近 31 日にアップロードできる枚数（どの 1 か月を取っても 1,600 枚以下になる） */
export const GLOBAL_UPLOADS_PER_31_DAYS = 1600;
/** サービス全体で保存しておける画像の合計サイズ（800MB） */
export const GLOBAL_STORAGE_BYTES = 800_000_000;

// pg_advisory_xact_lock に渡す番号。「アップロードの枠の予約」のために、このアプリの中で決めた番号
const UPLOAD_QUOTA_LOCK = 1001;

/** アップロード中のまま止まった行を片付けるまでの時間（Vercel の関数は最長 5 分で打ち切られる） */
const STALE_UPLOAD_INTERVAL = sql`interval '1 hour'`;

/** 1 回の片付けで扱う画像の数（1 回の処理が長くなりすぎないように） */
const CLEANUP_BATCH_SIZE = 100;

/** アップロードしたが、まだ投稿やアイコンに使っていない画像 */
export type UploadedImage = { id: number; url: string; width: number; height: number };

type ImageToReserve = { pathname: string; sizeBytes: number; width: number; height: number };

/**
 * アップロードの枠を予約する。上限を確かめてから「アップロード中」の行を追加する。
 * Blob へ保存する「前」に予約するのは、無料枠の回数が保存を試みた時点で使われるため。
 * 先に保存してから上限を確かめると、上限を超えた分まで回数を使ってしまう
 */
export async function reserveMedia(
  ownerId: string,
  purpose: ImagePurpose,
  images: ImageToReserve[],
): Promise<number[]> {
  return db.transaction(async (tx) => {
    // 「数える → 追加する」の間に別のアップロードが割り込むと、2 つとも「まだ上限に届いていない」と
    // 判断して、上限を超えてしまう。そこでこのトランザクションの間だけ有効なロックを取り、
    // 予約の処理を 1 つずつ順番に行う。ロックはコミット（またはロールバック）で自動的に外れる
    await tx.execute(sql`select pg_advisory_xact_lock(${UPLOAD_QUOTA_LOCK})`);

    const usage = await getUsage(tx, ownerId);
    const count = images.length;
    const bytes = images.reduce((sum, image) => sum + image.sizeBytes, 0);

    if (usage.ownerUploadsLastDay + count > USER_UPLOADS_PER_DAY) {
      const remaining = Math.max(0, USER_UPLOADS_PER_DAY - usage.ownerUploadsLastDay);
      throw new UserFacingError(
        `画像のアップロードは 24 時間で ${USER_UPLOADS_PER_DAY} 枚までです（あと ${remaining} 枚）`,
      );
    }
    if (usage.uploadsLast31Days + count > GLOBAL_UPLOADS_PER_31_DAYS) {
      throw new UserFacingError(
        "サービス全体の今月のアップロード数が上限に達したため、いまは画像をアップロードできません",
      );
    }
    if (usage.liveBytes + bytes > GLOBAL_STORAGE_BYTES) {
      throw new UserFacingError(
        "サービス全体の画像の保存容量が上限に達したため、いまは画像をアップロードできません",
      );
    }

    const rows = await tx
      .insert(media)
      .values(images.map((image) => ({ ownerId, purpose, ...image })))
      .returning({ id: media.id, pathname: media.pathname });
    // 追加した行の ID を、渡された順番に並べて返す
    const idByPathname = new Map(rows.map((row) => [row.pathname, row.id]));
    return images.map((image) => idByPathname.get(image.pathname)!);
  });
}

/** 上限の判定に使う 3 つの数を、1 回の問い合わせでまとめて数える */
async function getUsage(tx: Transaction, ownerId: string) {
  // 削除済みの画像も「アップロードした回数」には数える（消せば何度でもアップロードできる、とならないように）。
  // 容量は、使用中とアップロード中の画像だけを合計する
  const { rows } = await tx.execute<{
    owner_uploads_last_day: string;
    uploads_last_31_days: string;
    live_bytes: string;
  }>(sql`
    select
      (select count(*) from ${media}
        where ${media.ownerId} = ${ownerId} and ${media.createdAt} > now() - interval '24 hours'
      ) as owner_uploads_last_day,
      (select count(*) from ${media}
        where ${media.createdAt} > now() - interval '31 days'
      ) as uploads_last_31_days,
      (select coalesce(sum(${media.sizeBytes}), 0) from ${media}
        where ${media.deletedAt} is null
      ) as live_bytes
  `);
  // count や sum の結果は大きな整数（bigint）なので、文字列で届く
  return {
    ownerUploadsLastDay: Number(rows[0].owner_uploads_last_day),
    uploadsLast31Days: Number(rows[0].uploads_last_31_days),
    liveBytes: Number(rows[0].live_bytes),
  };
}

/**
 * 画像をアップロードする（変換 → 枠の予約 → 保存）。
 * 返した画像の行は「アップロード中」のままなので、呼び出し元が投稿やアイコンの保存と同じトランザクションで
 * markMediaInUse() を呼ぶ。保存に失敗したときは discardMedia() で捨てる
 */
export async function uploadImages(
  ownerId: string,
  purpose: ImagePurpose,
  files: File[],
): Promise<UploadedImage[]> {
  if (files.length === 0) return [];

  // 変換はメモリと CPU を使うので、同時ではなく 1 枚ずつ行う
  const processed = [];
  for (const file of files) {
    const image = await processImage(Buffer.from(await file.arrayBuffer()), purpose);
    processed.push({ ...image, pathname: newPathname(purpose) });
  }

  const ids = await reserveMedia(
    ownerId,
    purpose,
    processed.map(({ pathname, sizeBytes, width, height }) => ({ pathname, sizeBytes, width, height })),
  );
  const reserved = processed.map((image, index) => ({ ...image, id: ids[index] }));

  const saved = await Promise.allSettled(
    reserved.map((image) => saveFile(image.pathname, image.data)),
  );
  const failure = saved.find((result) => result.status === "rejected");
  if (failure) {
    // 一部だけ保存できた場合も、保存した分を消してから失敗を伝える。
    // すべての保存が終わるのを待ってから消す（途中で消すと、あとからファイルができて残ってしまう）
    await discardMedia(reserved);
    throw failure.reason;
  }
  return reserved.map((image, index) => ({
    id: image.id,
    url: (saved[index] as PromiseFulfilledResult<{ url: string }>).value.url,
    width: image.width,
    height: image.height,
  }));
}

/**
 * アップロードした画像を「使用中」にする（url を記録する）。
 * 投稿やアイコンの保存と同じトランザクションの中で呼ぶこと。別々に行うと、その間に
 * 片付け（deleteUnusedMedia）が「どこにも使われていない画像」とみなして消してしまう
 */
export async function markMediaInUse(tx: Transaction, images: UploadedImage[]): Promise<void> {
  for (const image of images) {
    const updated = await tx
      .update(media)
      .set({ url: image.url })
      .where(and(eq(media.id, image.id), isNull(media.url), isNull(media.deletedAt)))
      .returning({ id: media.id });
    // 予約した行がなくなっている場合は、トランザクションごと取り消す
    if (updated.length === 0) throw new Error(`画像 ${image.id} の予約が見つかりません`);
  }
}

/** アップロードしたが使わなかった画像を捨てる（投稿の保存に失敗したときなど） */
export async function discardMedia(images: { id: number }[]): Promise<void> {
  if (images.length === 0) return;
  const ids = images.map((image) => image.id);
  try {
    const rows = await db
      .select({ pathname: media.pathname })
      .from(media)
      .where(inArray(media.id, ids));
    await deleteFiles(rows.map((row) => row.pathname));
    await db
      .update(media)
      .set({ deletedAt: sql`now()` })
      .where(and(inArray(media.id, ids), isNull(media.deletedAt)));
  } catch (error) {
    // ここで失敗しても、行は「アップロード中」のまま残るので、後の片付けで消える
    console.error("使わなかった画像の後片付けに失敗しました", error);
  }
}

/**
 * どこからも使われていない画像を探し、保存先から消して「削除済み」にする。
 * 投稿やアイコンを消したあとに呼ぶ。
 *
 * 「この投稿の画像を消す」と 1 つずつ指定するのではなく、DB の状態から「使われていない画像」を探す。
 * そのため、返信の連鎖削除で一緒に消えた他の人の画像や、前回の片付けが途中で失敗して残った画像も、
 * まとめて片付けられる
 */
export async function deleteUnusedMedia(): Promise<void> {
  try {
    const unused = await db
      .select({ id: media.id, pathname: media.pathname })
      .from(media)
      .where(
        and(
          isNull(media.deletedAt),
          or(
            // 投稿の画像なのに、どの投稿にも付いていない（投稿が削除された）
            and(
              eq(media.purpose, "post"),
              isNotNull(media.url),
              notExists(
                db.select({ one: sql`1` }).from(postMedia).where(eq(postMedia.mediaId, media.id)),
              ),
            ),
            // アイコンなのに、持ち主の今のアイコンではない（新しいアイコンに変えた）
            and(
              eq(media.purpose, "avatar"),
              isNotNull(media.url),
              notExists(
                db
                  .select({ one: sql`1` })
                  .from(users)
                  .where(and(eq(users.id, media.ownerId), eq(users.image, media.url))),
              ),
            ),
            // アップロード中のまま、長い時間がたった（途中で処理が止まった）
            and(isNull(media.url), lt(media.createdAt, sql`now() - ${STALE_UPLOAD_INTERVAL}`)),
          ),
        ),
      )
      .limit(CLEANUP_BATCH_SIZE);
    if (unused.length === 0) return;

    // 先にファイルを消してから、行を「削除済み」にする。逆の順番だと、ファイルの削除に失敗したときに
    // 「削除済みなのにファイルが残っている」状態になり、二度と片付けられなくなる
    await deleteFiles(unused.map((row) => row.pathname));
    await db
      .update(media)
      .set({ deletedAt: sql`now()` })
      .where(
        and(
          inArray(
            media.id,
            unused.map((row) => row.id),
          ),
          isNull(media.deletedAt),
        ),
      );
  } catch (error) {
    // 片付けに失敗しても、投稿の削除など本来の操作は終わっている。次の片付けでやり直されるので、記録だけ残す
    console.error("使われていない画像の片付けに失敗しました", error);
  }
}
