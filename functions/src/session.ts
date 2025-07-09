import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

type Session = {
  status: "idle" | "waiting_for_task" | "waiting_for_time";
  task?: string;
  createdAt: admin.firestore.Timestamp;
};

export async function getSession(userId: string): Promise<Session> {
  const doc = await db.collection("sessions").doc(userId).get();
  if (!doc.exists) {
    return { status: "idle", createdAt: admin.firestore.Timestamp.now() };
  }
  return doc.data() as Session;
}

export async function saveSession(userId: string, session: Partial<Session>) {
  await db.collection("sessions").doc(userId).set(
    {
      ...session,
      createdAt: admin.firestore.Timestamp.now(),
    },
    { merge: true }
  );
}

export async function clearSession(userId: string) {
  await db.collection("sessions").doc(userId).delete();
}
