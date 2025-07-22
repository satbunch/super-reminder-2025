import * as dotenv from "dotenv";
dotenv.config();

import { MiddlewareConfig, WebhookEvent, middleware, messagingApi } from "@line/bot-sdk";
import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { clearSession, getSession, saveSession } from "./session";
import { parseReminderMessage } from "./parser";
import { logger } from "firebase-functions";
import { generateReminderFlex, listReminders } from "./reminder";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const lineWebhook = onRequest({ secrets: ["LINE_CHANNEL_ACCESS_TOKEN", "LINE_CHANNEL_SECRET"] }, async (req, res) => {

  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;

  if (!channelAccessToken || !channelSecret) {
    throw new Error("LINE_CHANEL_ACCESS_TOKEN and LINE_CHANEL_SECRET must be set");
  }
  const config: MiddlewareConfig = {
    channelAccessToken,
    channelSecret,
  };

  const client = new messagingApi.MessagingApiClient({
    channelAccessToken,
  });

  logger.info("Received request:", { method: req.method });
  if (req.method !== "POST") {
    logger.warn("Method Not Allowed", { method: req.method });
    res.status(405).send("Method Not Allow");
    return;
  }

  try {
    await middleware(config)(req, res, async () => {

      const events: WebhookEvent[] = req.body.events;

      await Promise.all(events.map(async (event: WebhookEvent) => {
        logger.debug("Processing event", { event });

        if (event.type === "postback") {
          const userId = event.source.userId;
          const data = event.postback.data;

          if (!userId) return;

          const parsedData = new URLSearchParams(data);
          const action = parsedData.get("action");

          if (action === "askReminder") {
            await saveSession(userId, { status: "waiting_for_task" });
            await client.replyMessage({
              replyToken: event.replyToken,
              messages: [{ type: "text", text: "後で思い出したいことを教えて \nやめるときはキャンセルね" }],
            });
            return;
          }

          if (action === "deleteReminder") {
            const id = parsedData.get("id");
            if (!id) {
              await client.replyMessage({
                replyToken: event.replyToken,
                messages: [{ type: "text", text: "削除対象のIDが見つかりませんでした" }],
              });
              return;
            }

            const db = admin.firestore();
            await db.collection("reminders").doc(id).delete();

            await client.replyMessage({
              replyToken: event.replyToken,
              messages: [{ type: "text", text: "リマインダを削除しました" }],
            });
            return;
          }
        }

        if (event.type !== "message" || event.message.type !== "text") return;

        const userId = event.source.userId;
        const message = event.message.text;

        if (!userId) {
          logger.warn("UserId not found");
          return;
        }

        if (message === "キャンセル") {
          await clearSession(userId);
          await client.replyMessage({
            replyToken: event.replyToken,
            messages: [{ type: "text", text: "リマインドの登録をキャンセルしたよ" }],
          });
          return;
        }

        const session = await getSession(userId);

        if (session.status === "idle" && message === "リマインド") {
          await saveSession(userId, { status: "waiting_for_task" });
          await client.replyMessage({
            replyToken: event.replyToken,
            messages: [{ type: "text", text: "後で思い出したいことを教えて \nやめるときはキャンセルね" }],
          });
          return;
        }

        if (session.status === "idle" && message === "リマインド一覧") {
          const reminderList = await listReminders(userId);
          if (reminderList.length === 0) {
            await client.replyMessage({
              replyToken: event.replyToken,
              messages: [{ type: "text", text: "リマインダはありません" }],
            });
            return;
          }

          const flex = generateReminderFlex(reminderList) as messagingApi.FlexMessage;

          await client.replyMessage({
            replyToken: event.replyToken,
            messages: [flex],
          });
          return;
        }

        if (session.status === "waiting_for_task") {
          await saveSession(userId, { status: "waiting_for_time", task: message });
          await client.replyMessage({
            replyToken: event.replyToken,
            messages: [{ type: "text", text: `「${message}」だね！いつ教えて欲しい？` }],
          });
          return;
        }

        if (session.status === "waiting_for_time" && session.task) {
          const parsed = parseReminderMessage(message);
          if (!parsed) {
            await client.replyMessage({
              replyToken: event.replyToken,
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

        const exMessages = [
          "きだきだ☆",
          "ねいねい、ばー",
          "あっあっあ゛ーーー"
        ];

        const randomMessage = exMessages[Math.floor(Math.random() * exMessages.length)];

        await client.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: "text", text: randomMessage, }],
        });
      }));

      res.status(200).send("OK");
    });
  } catch (error) {
    logger.error("Error handling webhook", error);
    res.status(500).send("Internal Server Error");
  }
});
