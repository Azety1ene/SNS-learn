// 日時は DB に UTC で保存しているので、表示するときに日本時間へ変換する。
// サーバーとブラウザで同じ結果になるよう、タイムゾーンを明示している。

const dateTimeFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const yearMonthFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "long",
});

/** 例: 2026/10/23 12:34 */
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

/** 例: 2026/10/23 */
export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

/** 例: 2026年10月 */
export function formatYearMonth(iso: string): string {
  return yearMonthFormat.format(new Date(iso));
}
