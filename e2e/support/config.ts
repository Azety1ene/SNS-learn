import os from "node:os";
import path from "node:path";

// E2E テストの設定値。テスト専用の値なので、本番の秘密情報とは関係ない
export const E2E_PORT = 3100;
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgres://postgres@127.0.0.1:5432/sns_e2e";
export const E2E_AUTH_SECRET = "e2e-only-secret-not-used-in-production";
// E2E テストでアップロードした画像の保存先（一時フォルダ）
export const E2E_STORAGE_DIR = path.join(os.tmpdir(), "sns-learn-e2e-storage");
