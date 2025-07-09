import { parseReminderMessage } from "../src/parser";

describe("parseReminderMessage - 基本動作確認", () => {
  describe("chrono-node機能の動作確認", () => {
    it("明日をパースできる", () => {
      const result = parseReminderMessage("明日");
      expect(result).not.toBeNull();
      expect(result!.remindAt).toBeInstanceOf(Date);
    });

    it("来週月曜日をパースできる", () => {
      const result = parseReminderMessage("来週月曜日");
      expect(result).not.toBeNull();
      expect(result!.remindAt).toBeInstanceOf(Date);
    });

    it("月曜日をパースできる", () => {
      const result = parseReminderMessage("月曜日");
      expect(result).not.toBeNull();
      expect(result!.remindAt).toBeInstanceOf(Date);
    });
  });

  describe("日本語時間帯マッピング", () => {
    it("朝をパースできる", () => {
      const result = parseReminderMessage("明日の朝");
      expect(result).not.toBeNull();
      expect(result!.remindAt).toBeInstanceOf(Date);
    });

    it("昼をパースできる", () => {
      const result = parseReminderMessage("明日の昼");
      expect(result).not.toBeNull();
      expect(result!.remindAt).toBeInstanceOf(Date);
    });

    it("夕方をパースできる", () => {
      const result = parseReminderMessage("明日の夕方");
      expect(result).not.toBeNull();
      expect(result!.remindAt).toBeInstanceOf(Date);
    });

    it("夜をパースできる", () => {
      const result = parseReminderMessage("明日の夜");
      expect(result).not.toBeNull();
      expect(result!.remindAt).toBeInstanceOf(Date);
    });
  });

  describe("フォールバック機能", () => {
    it("既存の「1時間後」パターンが正常に動作する", () => {
      const result = parseReminderMessage("1時間後");
      expect(result).not.toBeNull();
      expect(result!.remindAt).toBeInstanceOf(Date);
    });

    it("既存の「30分後」パターンが正常に動作する", () => {
      const result = parseReminderMessage("30分後");
      expect(result).not.toBeNull();
      expect(result!.remindAt).toBeInstanceOf(Date);
    });

    it("既存の「明日9時」パターンが正常に動作する", () => {
      const result = parseReminderMessage("明日9時");
      expect(result).not.toBeNull();
      expect(result!.remindAt).toBeInstanceOf(Date);
    });
  });

  describe("エラーハンドリング", () => {
    it("無効な入力でnullを返す", () => {
      const result = parseReminderMessage("無効な入力です");
      expect(result).toBeNull();
    });

    it("空文字列でnullを返す", () => {
      const result = parseReminderMessage("");
      expect(result).toBeNull();
    });
  });
});