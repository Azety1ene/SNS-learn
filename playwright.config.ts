import { defineConfig, devices } from "@playwright/test";
import { E2E_AUTH_SECRET, E2E_BASE_URL, E2E_DATABASE_URL, E2E_PORT } from "./e2e/support/config";

// E2E テスト: 本物のブラウザで、本番と同じようにビルドしたアプリを操作して確かめる
export default defineConfig({
  testDir: "./e2e",
  // DB を共有するので 1 つずつ順番に実行する
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  globalSetup: "./e2e/support/global-setup.ts",
  use: {
    baseURL: E2E_BASE_URL,
    trace: "retain-on-failure",
    // Claude の作業環境では、あらかじめ入っている Chromium を使う（CI では Playwright が用意したものを使う）
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined },
  },
  // スマホの画面サイズで確かめる
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: `pnpm build && pnpm start --port ${E2E_PORT}`,
    url: E2E_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      BETTER_AUTH_SECRET: E2E_AUTH_SECRET,
      BETTER_AUTH_URL: E2E_BASE_URL,
      // GitHub へのログインはテストでは行わないので、仮の値を入れておく
      GITHUB_CLIENT_ID: "e2e-not-used",
      GITHUB_CLIENT_SECRET: "e2e-not-used",
    },
  },
});
