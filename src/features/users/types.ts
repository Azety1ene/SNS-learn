/** プロフィールページに表示するデータ */
export type ProfileView = {
  id: string;
  handle: string;
  name: string;
  image: string | null;
  bio: string;
  /** ISO 8601 形式の登録日時 */
  createdAt: string;
  followerCount: number;
  followingCount: number;
  /** 見ている人がこの人をフォロー中か */
  isFollowedByViewer: boolean;
  /** 見ている人本人のプロフィールか */
  isViewer: boolean;
};

/** フォロー一覧などに出す、ユーザーの簡単な情報 */
export type UserSummary = {
  id: string;
  handle: string;
  name: string;
  image: string | null;
  bio: string;
};
