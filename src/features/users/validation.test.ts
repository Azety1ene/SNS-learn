import { describe, expect, it } from "vitest";
import { displayNameSchema, handleSchema } from "./validation";

describe("handleSchema", () => {
  it("小文字にそろえ、前後の空白を取り除く", () => {
    expect(handleSchema.parse("  Taro_123 ")).toBe("taro_123");
  });

  it.each([
    ["ab", "IDは3文字以上にしてください"],
    ["a".repeat(16), "IDは15文字以内にしてください"],
    ["taro-123", "IDには半角の英数字と _ だけが使えます"],
    ["たろう", "IDには半角の英数字と _ だけが使えます"],
    ["admin", "このIDは使えません"],
  ])("%s は使えない", (input, message) => {
    const result = handleSchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(message);
  });
});

describe("displayNameSchema", () => {
  it("改行を含む名前は受け付けない", () => {
    expect(displayNameSchema.safeParse("山田\n太郎").success).toBe(false);
  });

  it("空白だけの名前は受け付けない", () => {
    expect(displayNameSchema.safeParse("   ").success).toBe(false);
  });
});
