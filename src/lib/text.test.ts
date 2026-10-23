import { describe, expect, it } from "vitest";
import { countCharacters, normalizeText } from "./text";

describe("countCharacters", () => {
  it("日本語は 1 文字を 1 と数える", () => {
    expect(countCharacters("こんにちは")).toBe(5);
  });

  it("家族の絵文字のように複数の部品でできた絵文字も 1 文字と数える", () => {
    const family = "👨‍👩‍👧";
    expect(family.length).toBe(8);
    expect(countCharacters(family)).toBe(1);
  });

  it("国旗の絵文字も 1 文字と数える", () => {
    expect(countCharacters("🇯🇵")).toBe(1);
  });
});

describe("normalizeText", () => {
  it("改行コードを \\n にそろえ、前後の空白を取り除く", () => {
    expect(normalizeText("  1行目\r\n2行目\r3行目  ")).toBe("1行目\n2行目\n3行目");
  });
});
