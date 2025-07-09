import * as admin from "firebase-admin";
import { messagingApi } from "@line/bot-sdk";
import { onSchedule } from "firebase-functions/scheduler";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
if (!channelAccessToken) {
  throw new Error("LINE_CHANNEL_ACCESS_TOKEN must be set");
}

const client = new messagingApi.MessagingApiClient({
  channelAccessToken,
});

export const checkReminders = onSchedule("every 1 minutes", async () => {
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
});
