import { describe, expect, it } from "vitest";
import { POST_MAX_LENGTH, postContentSchema } from "./validation";

describe("postContentSchema", () => {
  it("前後の空白を取り除いた本文を返す", () => {
    expect(postContentSchema.parse("  こんにちは  ")).toBe("こんにちは");
  });

  it("空白だけの本文は受け付けない", () => {
    const result = postContentSchema.safeParse(" \n ");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("本文を入力してください");
  });

  it(`${POST_MAX_LENGTH} 文字ちょうどは受け付け、1 文字でも超えたら受け付けない`, () => {
    expect(postContentSchema.safeParse("あ".repeat(POST_MAX_LENGTH)).success).toBe(true);
    expect(postContentSchema.safeParse("あ".repeat(POST_MAX_LENGTH + 1)).success).toBe(false);
  });

  it("絵文字は見た目の 1 文字を 1 文字として数える", () => {
    expect(postContentSchema.safeParse("👨‍👩‍👧".repeat(POST_MAX_LENGTH)).success).toBe(true);
  });

  it("文字列でないものは受け付けない", () => {
    expect(postContentSchema.safeParse(null).success).toBe(false);
  });
});
