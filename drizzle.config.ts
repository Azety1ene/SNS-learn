import { defineConfig } from "drizzle-kit";

// `pnpm db:generate` で、schema.ts の変更から SQL のマイグレーションファイルを drizzle/ に作る
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
