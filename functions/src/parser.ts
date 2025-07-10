import * as chrono from "chrono-node";

// 日本語時間帯を具体的な時間に変換する関数
function preprocessTimeExpression(text: string): string {
  const timeMapping: { [key: string]: string } = {
    "朝": "9時00分",
    "昼": "12時00分",
    "お昼": "12時00分",
    "夕方": "18時00分",
    "夜": "21時00分",
    "深夜": "23時00分"
  };

  let processedText = text;
  for (const [timeWord, timeValue] of Object.entries(timeMapping)) {
    processedText = processedText.replace(new RegExp(timeWord, "g"), timeValue);
  }

  return processedText;
}

export function parseReminderMessage(text: string): { remindAt: Date } | null {
  const now = new Date();

  // 1. まず chrono-node で解析を試行
  try {
    const preprocessedText = preprocessTimeExpression(text);
    const parsedDate = chrono.ja.parseDate(preprocessedText, now, { forwardDate: true });

    if (parsedDate) {
      // chrono-nodeはローカル時間で解析するため、そのまま返す
      return { remindAt: parsedDate };
    }
  } catch (error) {
    console.warn("chrono-node parsing failed:", error);
  }

  // 2. chrono-node が失敗した場合、既存の正規表現ベースの処理にフォールバック

  // remindAtの共通化
  const buildRemindAt = (dayOffset: number, hourJST: number, minuteJST = 0) => {
    return new Date(Date.UTC(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + dayOffset,
      hourJST - 9,
      minuteJST
    ));
  };

  // 明日○時○分
  const tommorowMatch = text.match(/^明日(?:の)?(\d{1,2})時(?:([0-5]?\d)分)?$/);
  if (tommorowMatch) {
    const hour = parseInt(tommorowMatch[1], 10);
    const minute = tommorowMatch[2] ? parseInt(tommorowMatch[2], 10) : 0;
    return { remindAt: buildRemindAt(1, hour, minute) };
  }

  // 今日○時
  const todayMatch = text.match(/^今日(?:の)?(\d{1,2})時(?:([0-5]?\d)分)?$/);
  if (todayMatch) {
    const hour = parseInt(todayMatch[1], 10);
    const minute = todayMatch[2] ? parseInt(todayMatch[2], 10) : 0;
    let remindAt = buildRemindAt(0, hour, minute);

    // もしすでに過ぎていたら明日にする
    if (remindAt.getTime() <= now.getTime()) {
      remindAt = buildRemindAt(1, hour, minute);
    }

    return { remindAt };
  }

  // ○時
  const hourOnlyMatch = text.match(/^(\d{1,2})時/);
  if (hourOnlyMatch) {
    const hour = parseInt(hourOnlyMatch[1], 10);
    let remindAt = buildRemindAt(0, hour);

    if (remindAt <= now) {
      remindAt = buildRemindAt(1, hour);
    }

    return { remindAt };
  }

  // ○時間後
  const hoursLaterMatch = text.match(/^(\d{1,2})時間後$/);
  if (hoursLaterMatch) {
    const hours = parseInt(hoursLaterMatch[1], 10);
    const remindAt = new Date(now.getTime() + hours * 60 * 60 * 1000);
    return { remindAt };
  }

  // ○分後
  const minutesLaterMatch = text.match(/^(\d{1,2})分後$/);
  if (minutesLaterMatch) {
    const minutes = parseInt(minutesLaterMatch[1], 10);
    const remindAt = new Date(now.getTime() + minutes * 60 * 1000);
    return { remindAt };
  }

  // 〇〇時〇〇分
  const hourMinuteMatch = text.match(/^(\d{1,2})時(\d{1,2})分$/);
  if (hourMinuteMatch) {
    const hour = parseInt(hourMinuteMatch[1], 10);
    const minute = parseInt(hourMinuteMatch[2], 10);
    let remindAt = buildRemindAt(0, hour, minute);

    if (remindAt <= now) {
      remindAt = buildRemindAt(1, hour, minute);
    }

    return { remindAt };
  }

  // 3. どちらも失敗した場合はnullを返す
  return null;
}

// 既存のコードとの互換性のため、古い関数名もエクスポート
export { parseReminderMessage as parseReminderMessageLegacy };
