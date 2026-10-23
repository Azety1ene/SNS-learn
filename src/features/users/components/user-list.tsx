import Link from "next/link";
import { Avatar } from "@/components/avatar";
import type { UserSummary } from "../types";

/** フォロー・フォロワーの一覧 */
export function UserList({ users, emptyMessage }: { users: UserSummary[]; emptyMessage: string }) {
  if (users.length === 0) {
    return <p className="px-4 py-10 text-center text-sm text-zinc-500">{emptyMessage}</p>;
  }
  return (
    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {users.map((user) => (
        <li key={user.id}>
          <Link
            href={`/u/${user.handle}`}
            className="flex gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            <Avatar name={user.name} image={user.image} />
            <div className="min-w-0">
              <p className="truncate font-bold">{user.name}</p>
              <p className="text-sm text-zinc-500">@{user.handle}</p>
              {user.bio && <p className="mt-1 line-clamp-2 text-sm">{user.bio}</p>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
