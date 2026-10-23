/**
 * 画面に渡す投稿のデータ。
 * Server Component から Client Component へ渡すので、Date ではなく文字列など「そのまま送れる形」にしている。
 */
export type PostView = {
  id: number;
  content: string;
  /** ISO 8601 形式の日時（例: 2026-10-23T03:00:00.000Z） */
  createdAt: string;
  parentId: number | null;
  author: {
    id: string;
    handle: string;
    name: string;
    image: string | null;
  };
  likeCount: number;
  replyCount: number;
  /** 見ている人がいいね済みか（ログインしていなければ false） */
  likedByMe: boolean;
  /** 投稿に付いた画像（0〜4 枚、並び順どおり） */
  images: PostImage[];
};

export type PostImage = {
  url: string;
  width: number;
  height: number;
  /** 代替テキスト（画像の説明）。空のこともある */
  alt: string;
};

export type TimelinePage = {
  posts: PostView[];
  /** 続きを読み込むときに渡す値。続きがなければ null */
  nextCursor: number | null;
};
