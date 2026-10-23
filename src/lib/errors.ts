import type { ZodError } from "zod";

/**
 * 利用者にそのまま見せてよいエラー（入力ミス、見つからない、など）。
 * それ以外のエラーは、内部の情報が漏れないよう詳細を隠して「問題が発生しました」と表示する。
 */
export class UserFacingError extends Error {}

/** Zod の検証エラーから、最初のメッセージだけを取り出す */
export function firstIssueMessage(error: ZodError): string {
  return error.issues[0]?.message ?? "入力内容を確認してください";
}

/**
 * PostgreSQL のエラーコードを取り出す（23505 = 一意制約違反、23503 = 外部キー違反）。
 * Drizzle はドライバーのエラーを包んで投げることがあるので、cause もたどる。
 */
export function getPgErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  while (current && typeof current === "object") {
    if ("code" in current && typeof current.code === "string") {
      return current.code;
    }
    current = "cause" in current ? current.cause : undefined;
  }
  return undefined;
}

export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FOREIGN_KEY_VIOLATION = "23503";
