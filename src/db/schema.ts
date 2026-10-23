import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// 日時はすべて「タイムゾーン付き」で保存する（DB には UTC で入り、表示時に日本時間へ変換する）
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

// ---------------------------------------------------------------------------
// ログインのためのテーブル（Better Auth が読み書きする）
// 項目は Better Auth が決めた形に合わせている。users だけは SNS 用の項目を追加している。
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  /** 表示名（最初は GitHub の名前。プロフィール編集で変えられる） */
  name: text("name").notNull(),
  /** メールアドレス。画面には出さない */
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  /** アイコン画像の URL */
  image: text("image"),
  /** @ID（小文字の英数字と _）。初回登録で決めるまでは空 */
  handle: text("handle").unique(),
  /** 自己紹介 */
  bio: text("bio").notNull().default(""),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    /** Cookie に入れる合言葉。これを持っている人を「ログイン中のその人」とみなす */
    token: text("token").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

/** 外部サービス（GitHub など）のアカウントとの紐付け */
export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** 外部サービス側の ID */
    accountId: text("account_id").notNull(),
    /** "github" など */
    providerId: text("provider_id").notNull(),
    // 外部サービスのトークン類。Better Auth が暗号化して保存する（lib/auth.ts の encryptOAuthTokens）
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    /** Better Auth の標準項目。このアプリはパスワードを使わないので常に空 */
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("accounts_user_id_idx").on(t.userId),
    // 同じ外部アカウントが 2 人のユーザーに紐付かないようにする
    uniqueIndex("accounts_provider_account_idx").on(t.providerId, t.accountId),
  ],
);

/** ログイン途中の一時的なデータ（OAuth の state など） */
export const verifications = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verifications_identifier_idx").on(t.identifier)],
);

/** ログイン処理への連続アクセスを制限するためのカウンター */
export const rateLimits = pgTable("rate_limits", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  /** 最後のアクセス時刻（ミリ秒）。32bit の integer に収まらないので bigint */
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

// ---------------------------------------------------------------------------
// SNS のテーブル
// ---------------------------------------------------------------------------

export const posts = pgTable(
  "posts",
  {
    // 連番の ID。新しい投稿ほど大きいので、「この ID より小さいもの」で続きを取得できる
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** 返信先の投稿。返信でなければ空。元の投稿が消えたら返信も消える */
    parentId: bigint("parent_id", { mode: "number" }).references(
      (): AnyPgColumn => posts.id,
      { onDelete: "cascade" },
    ),
    content: text("content").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("posts_author_id_idx").on(t.authorId, t.id),
    index("posts_parent_id_idx").on(t.parentId, t.id),
    // 文字数は画面とサーバーで 280 文字に制限している。DB では「空でない・極端に長くない」だけを最後の砦として守る
    check(
      "posts_content_length",
      sql`char_length(${t.content}) between 1 and 3000`,
    ),
  ],
);

export const likes = pgTable(
  "likes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: bigint("post_id", { mode: "number" })
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    // 同じ人が同じ投稿に 2 回いいねできないよう、2 つの列の組み合わせを主キーにする
    primaryKey({ columns: [t.userId, t.postId] }),
    index("likes_post_id_idx").on(t.postId),
  ],
);

export const follows = pgTable(
  "follows",
  {
    /** フォローする人 */
    followerId: text("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** フォローされる人 */
    followingId: text("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followingId] }),
    index("follows_following_id_idx").on(t.followingId),
    check("follows_not_self", sql`${t.followerId} <> ${t.followingId}`),
  ],
);
