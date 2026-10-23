const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });

/**
 * 見た目の 1 文字を 1 と数える。
 * JavaScript の `"👨‍👩‍👧".length` は 8 になってしまうので、文字数制限には使えない。
 */
export function countCharacters(text: string): number {
  return Array.from(segmenter.segment(text)).length;
}

/** 改行コードを \n にそろえ、前後の空白を取り除く */
export function normalizeText(text: string): string {
  return text.replace(/\r\n?/g, "\n").trim();
}
