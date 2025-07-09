import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import { MiddlewareConfig, WebhookEvent, middleware, messagingApi } from "@line/bot-sdk";
import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/https";
import { clearSession, getSession, saveSession } from "./session";
import { parseReminderMessage } from "./parser";

if (!admin.apps.length) {
  admin.initializeApp();
}

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const channelSecret = process.env.LINE_CHANNEL_SECRET;

if (!channelAccessToken || !channelSecret) {
  throw new Error("LINE_CHANNEL_ACCESS_TOKEN and LINE_CHANNEL_SECRET must be set");
}
const config: MiddlewareConfig = {
  channelAccessToken,
  channelSecret,
};

const client = new messagingApi.MessagingApiClient({
  channelAccessToken,
});

const app = express();
app.use(middleware(config));

app.post("/webhook", async (req: express.Request, res: express.Response) => {
  const events: WebhookEvent[] = req.body.events;

  await Promise.all(events.map(async (event: WebhookEvent) => {
    if (event.type !== "message" || event.message.type !== "text") return;

    const userId = event.source.userId;
    const message = event.message.text;

    if (!userId) {
      console.log("UserId not found");
      return;
    }

    const session = await getSession(userId);

    if (session.status === "idle") {
      if (message.includes("リマインド")) {
        await saveSession(userId, { status: "waiting_for_task" });
        await client.pushMessage({
          to: userId,
          messages: [{ type: "text", text: "後で思い出したいことを教えて" }],
        });
        return;
      }
    }

    if (session.status === "waiting_for_task") {
      await saveSession(userId, { status: "waiting_for_time", task: message });
      await client.pushMessage({
        to: userId,
        messages: [{ type: "text", text: `「${message}」だね！いつ教えて欲しい？` }],
      });
      return;
    }

    if (session.status === "waiting_for_time" && session.task) {
      const parsed = parseReminderMessage(message);
      if (!parsed) {
        await client.pushMessage({
          to: userId,
          messages: [{ type: "text", text: "ごめん、時間がよく分からなかった..." }],
        });
        return;
      }

      const { remindAt } = parsed;
      const db = admin.firestore();
      await db.collection("reminders").add({
        userId,
        message: session.task,
        remindAt: admin.firestore.Timestamp.fromDate(remindAt),
      });

      await clearSession(userId);

      // JST形式で表示
      const remindDateJST = new Date(remindAt.getTime() + 9 * 60 * 60 * 1000);
      const dateText = `${remindDateJST.getFullYear()}年${remindDateJST.getMonth() + 1}月${remindDateJST.getDate()}日 ${remindDateJST.getHours()}時${remindDateJST.getMinutes().toString().padStart(2, "0")}分`

      await client.pushMessage({
        to: userId,
        messages: [{
          type: "text",
          text: `じゃあ ${dateText} に「${session.task}」って言うね！`,
        }],
      });
      return;
    }

    await client.pushMessage({
      to: userId,
      messages: [{ type: "text", text: "「リマインド」って言ってくれると登録できるよ！" }],
    });
  }));

  res.send("OK");
});

export const api = onRequest(app);
