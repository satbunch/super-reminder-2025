import * as admin from "firebase-admin";
import { FlexMessage, messagingApi } from "@line/bot-sdk";
import { onSchedule } from "firebase-functions/scheduler";

type Reminder = {
  id: string;
  message: string;
  remindAt: admin.firestore.Timestamp;
}

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const listReminders = async (userId: string) => {
  const snapshot = await db.collection("reminders")
    .where("userId", "==", userId)
    .orderBy("remindAt")
    .get();

  if (snapshot.empty) return [];

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as { id: string, message: string, remindAt: admin.firestore.Timestamp }[];
};

export const generateReminderFlex = (reminders: Reminder[]): FlexMessage => {
  return {
    type: "flex",
    altText: "リマインダー一覧",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: reminders.map(reminder => {
          const date = reminder.remindAt.toDate();
          const dateText = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}時${date.getMinutes().toString().padStart(2, "0")}分`;

          return {
            type: "box",
            layout: "horizontal",
            spacing: "md",
            contents: [
              {
                type: "text",
                text: `${reminder.message}（${dateText}）`,
                size: "sm",
                wrap: true,
                flex: 5
              },
              {
                type: "button",
                action: {
                  type: "postback",
                  label: "☓",
                  data: `action=deleteReminder&id=${reminder.id}`,
                  displayText: `${reminder.message} を削除`
                },
                style: "primary",
                color: "#FF5555",
                height: "sm",
                flex: 1
              }
            ]
          };
        })
      }
    }
  };
};

export const checkReminders = onSchedule({ schedule: "every 1 minutes", secrets: ["LINE_CHANNEL_ACCESS_TOKEN"] },
  async () => {
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    if (!channelAccessToken) {
      throw new Error("LINE_CHANNEL_ACCESS_TOKEN must be set");
    }

    const client = new messagingApi.MessagingApiClient({
      channelAccessToken,
    });

    const now = admin.firestore.Timestamp.now();

    const snapshot = await db.collection("reminders")
      .where("remindAt", "<=", now)
      .get();

    if (snapshot.empty) {
      console.log("No reminders to send");
      return
    }

    console.log(`Found ${snapshot.size} reminder(s) to send`);

    await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data();
      const userId = data.userId;
      const message = data.message;

      if (!userId || !message) {
        console.warn(`Invalid reminder: ${doc.id}`);
        return;
      }

      try {
        await client.pushMessage({
          to: userId,
          messages: [{ type: "text", text: message }],
        });
        console.log(`Sent reminder to ${userId}: ${message}`);

        await doc.ref.delete();
        console.log(`Deleted reminder ${doc.id}`);
      } catch (error) {
        console.error(`Failed to send reminder ${doc.id}:`, error);
      }
    }));
  }
);
