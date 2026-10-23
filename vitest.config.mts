import os from "node:os";
import path from "node:path";
import { defineConfig } from "vitest/config";

// テスト専用の DB。開発用の DB とは分けて、テストのたびに中身を空にする
const testDatabaseURL =
  process.env.TEST_DATABASE_URL ?? "postgres://postgres@127.0.0.1:5432/sns_test";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // server-only は Next.js の外で読み込むとエラーになるので、テストでは空のモジュールに差し替える
      "server-only": path.resolve(import.meta.dirname, "tests/support/empty-module.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globalSetup: ["tests/support/global-setup.ts"],
    setupFiles: ["tests/support/setup.ts"],
    env: {
      DATABASE_URL: testDatabaseURL,
      BETTER_AUTH_SECRET: "test-only-secret-not-used-in-production",
      BETTER_AUTH_URL: "http://localhost:3000",
      // 画像の保存先（テストでは一時フォルダのディスクに保存する）
      LOCAL_STORAGE_DIR: path.join(os.tmpdir(), "sns-learn-test-storage"),
    },
    // テストどうしで同じ DB を使うので、ファイルは 1 つずつ順番に実行する
    fileParallelism: false,
  },
});
