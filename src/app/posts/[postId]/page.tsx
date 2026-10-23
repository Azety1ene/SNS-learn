import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { PostListSkeleton } from "@/components/skeletons";
import { PostCard } from "@/features/posts/components/post-card";
import { PostComposer } from "@/features/posts/components/post-composer";
import { getPost, getReplies } from "@/features/posts/queries";
import { postIdSchema } from "@/features/posts/validation";
import { getRegisteredViewer } from "@/lib/session";
import { baseOpenGraph } from "@/lib/site";
import { truncateText } from "@/lib/text";

/** ページのタイトルと、リンクを貼ったときのプレビュー（OGP）の内容 */
export async function generateMetadata({
  params,
}: PageProps<"/posts/[postId]">): Promise<Metadata> {
  const postId = postIdSchema.safeParse((await params).postId);
  const post = postId.success ? await getPost(postId.data, null) : null;
  if (!post) return { title: "投稿が見つかりません" };

  const author = `${post.author.name}さん（@${post.author.handle}）`;
  // 改行はプレビューでは表示されないので、空白 1 つにまとめる
  const text = post.content.replace(/\s+/g, " ");
  return {
    title: `${post.author.name}さんの投稿「${truncateText(text, 30)}」`,
    description: truncateText(text, 120),
    openGraph: {
      ...baseOpenGraph,
      type: "article",
      title: `${author}の投稿`,
      description: truncateText(text, 120),
      url: `/posts/${post.id}`,
      publishedTime: post.createdAt,
    },
  };
}

/** 投稿の詳細（返信先・投稿本体・返信フォーム・返信の一覧） */
export default function PostPage({ params }: PageProps<"/posts/[postId]">) {
  return (
    <>
      <PageHeader title="投稿" backHref="/" />
      <Suspense fallback={<PostListSkeleton count={2} />}>
        <PostThread params={params} />
      </Suspense>
    </>
  );
}

async function PostThread({ params }: Pick<PageProps<"/posts/[postId]">, "params">) {
  // URL の値は誰でも自由に書き換えられるので、数値かどうかを確かめてから使う
  const postId = postIdSchema.safeParse((await params).postId);
  if (!postId.success) notFound();

  const viewer = await getRegisteredViewer();
  const viewerId = viewer?.id ?? null;
  const post = await getPost(postId.data, viewerId);
  if (!post) notFound();

  // 返信先と返信の一覧は互いに関係ないので、同時に問い合わせる
  const [parent, replies] = await Promise.all([
    post.parentId ? getPost(post.parentId, viewerId) : null,
    getReplies(post.id, viewerId),
  ]);

  return (
    <>
      {parent && (
        <div className="border-b border-zinc-200 dark:border-zinc-800">
          <p className="px-4 pt-3 text-xs text-zinc-500">返信先の投稿</p>
          <PostCard post={parent} viewerId={viewerId} />
        </div>
      )}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <PostCard post={post} viewerId={viewerId} highlighted redirectHomeOnDelete />
      </div>
      {viewer ? (
        <PostComposer parentId={post.id} />
      ) : (
        <p className="border-b border-zinc-200 px-4 py-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          <Link href="/login" className="text-sky-600 hover:underline dark:text-sky-400">
            ログイン
          </Link>
          すると返信できます。
        </p>
      )}
      <section aria-label="返信">
        {replies.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-zinc-500">まだ返信はありません。</p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {replies.map((reply) => (
              <li key={reply.id}>
                <PostCard post={reply} viewerId={viewerId} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
