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
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// 日時はすべて「タイムゾーン付き」で保存する（DB には UTC で入り、表示時に日本時間へ変換する）
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
// 更新日時は、Drizzle で UPDATE するたびに自動で今の時刻になる（書き忘れを防ぐ）
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// ---------------------------------------------------------------------------
// ログインのためのテーブル（Better Auth が読み書きする）
// 項目は Better Auth が決めた形に合わせている。users だけは SNS 用の項目を追加している。
// ---------------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
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
  },
  (t) => [
    // @ID の形式（小文字の英数字と _ で 3〜15 文字）を DB でも守る。
    // 小文字だけに限ることで、一意制約が「大文字・小文字を区別しない一意」として働く
    check("users_handle_format", sql`${t.handle} ~ '^[a-z0-9_]{3,15}$'`),
  ],
);

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
    // タイムライン用: 返信ではない投稿（parent_id が空）だけを、ID の順に並べた索引（部分インデックス）。
    // 効果の計測結果は docs/learning/02-database.md の 5-2 を参照
    index("posts_timeline_idx").on(t.id).where(sql`${t.parentId} is null`),
    // プロフィールの投稿一覧用。ユーザー削除時に、その人の投稿を探すのにも使われる
    index("posts_author_id_idx").on(t.authorId, t.id),
    // 返信一覧用
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

// ---------------------------------------------------------------------------
// 画像のテーブル（M2）
// 設計の理由は docs/adr/0008-image-storage.md、計測結果は docs/learning/03-images.md を参照
// ---------------------------------------------------------------------------

/**
 * アップロードされた画像 1 枚（投稿の画像とアイコンの両方）。
 * 画像そのものは Vercel Blob に置き、ここには「どこにあるか」と大きさなどを記録する。
 *
 * 1 行の状態は 3 つ:
 * - アップロード中: url が空（枠を予約しただけ）
 * - 使用中: url があり、deleted_at が空
 * - 削除済み: deleted_at がある。容量の計算からは外すが、
 *   「1 日に何枚アップロードしたか」を数えるため、しばらく行を残す（論理削除）
 */
export const media = pgTable(
  "media",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** 用途: post（投稿の画像）または avatar（アイコン） */
    purpose: text("purpose", { enum: ["post", "avatar"] }).notNull(),
    /** 保存先でのファイルの場所。アップロードの前に決めておくので、途中で失敗しても後片付けできる */
    pathname: text("pathname").notNull().unique(),
    /** 画面に表示するときの URL。アップロードが終わるまでは空 */
    url: text("url").unique(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    createdAt: createdAt(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    // 「この人が最近何枚アップロードしたか」を数えるため。ユーザー削除時に、その人の画像を探すのにも使われる
    index("media_owner_id_created_at_idx").on(t.ownerId, t.createdAt),
    // 「サービス全体で直近 31 日に何枚アップロードされたか」を数えるため
    index("media_created_at_idx").on(t.createdAt),
    // 使用中の行（deleted_at が空）だけの部分インデックス。合計容量の計算と、使われていない画像の検索に使う。
    // 削除済みの行がどれだけ増えても、この 2 つの処理の速さが変わらない（計測は docs/learning/03-images.md）
    index("media_live_idx").on(t.sizeBytes).where(sql`${t.deletedAt} is null`),
    check("media_purpose", sql`${t.purpose} in ('post', 'avatar')`),
    check("media_size_positive", sql`${t.sizeBytes} > 0`),
    check("media_dimensions_positive", sql`${t.width} > 0 and ${t.height} > 0`),
  ],
);

/** 投稿に付けた画像（どの投稿の、何枚目か） */
export const postMedia = pgTable(
  "post_media",
  {
    postId: bigint("post_id", { mode: "number" })
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    /** 何枚目か（0〜3） */
    position: smallint("position").notNull(),
    /** 1 枚の画像を 2 つの投稿で使い回すことはないので、一意にする */
    mediaId: bigint("media_id", { mode: "number" })
      .notNull()
      .unique()
      .references(() => media.id, { onDelete: "cascade" }),
    /** 代替テキスト（画像の説明）。画面が見えない人の読み上げなどに使われる */
    altText: text("alt_text").notNull().default(""),
  },
  (t) => [
    // 「投稿 ID と何枚目か」の組み合わせを主キーにし、何枚目かを 0〜3 に限ることで、
    // 1 つの投稿に付けられる画像は 4 枚までになる（アプリのチェックをすり抜けても DB が守る）
    primaryKey({ columns: [t.postId, t.position] }),
    check("post_media_position_range", sql`${t.position} between 0 and 3`),
    // 文字数は画面とサーバーで 1000 文字に制限している。DB では極端に長いものだけを防ぐ
    check("post_media_alt_text_length", sql`char_length(${t.altText}) <= 10000`),
  ],
);
