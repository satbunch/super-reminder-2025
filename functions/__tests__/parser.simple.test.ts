import { parseReminderMessage } from "../src/parser";

describe("parseReminderMessage - 基本機能テスト", () => {
  it("相対時間指定が正しく動作する", () => {
    const result = parseReminderMessage("1時間後");
    expect(result).not.toBeNull();
    expect(result!.remindAt).toBeInstanceOf(Date);
  });

  it("無効な入力でnullを返す", () => {
    const result = parseReminderMessage("無効な入力");
    expect(result).toBeNull();
  });

  it("明日の時間指定が動作する", () => {
    const result = parseReminderMessage("明日9時");
    expect(result).not.toBeNull();
    expect(result!.remindAt).toBeInstanceOf(Date);
  });

  it("今日の時間指定が動作する", () => {
    const result = parseReminderMessage("今日18時");
    expect(result).not.toBeNull();
    expect(result!.remindAt).toBeInstanceOf(Date);
  });

  it("分指定が動作する", () => {
    const result = parseReminderMessage("30分後");
    expect(result).not.toBeNull();
    expect(result!.remindAt).toBeInstanceOf(Date);
  });

  it("時間:分指定が動作する", () => {
    const result = parseReminderMessage("18時30分");
    expect(result).not.toBeNull();
    expect(result!.remindAt).toBeInstanceOf(Date);
  });
});