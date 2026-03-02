import { ID, Permission, Query, Role } from "react-native-appwrite";
import {
  account,
  databases,
  DATABASE_ID,
  STEPS_DAILY_COLLECTION_ID,
  STEPS_GOALS_COLLECTION_ID,
} from "@/lib/appwrite";

export async function getStepsDaily(start: Date, end: Date) {
  const user = await account.get();
  const res = await databases.listDocuments(DATABASE_ID, STEPS_DAILY_COLLECTION_ID, [
    Query.equal("userId", user.$id),
    Query.greaterThanEqual("date", start.toISOString()),
    Query.lessThanEqual("date", end.toISOString()),
  ]);
  return res.documents;
}

export async function saveStepsDaily(date: Date, payload: any) {
  const user = await account.get();
  const start = new Date(date); start.setHours(0, 0, 0, 0);
  const end = new Date(date); end.setHours(23, 59, 59, 999);

  const existing = await databases.listDocuments(DATABASE_ID, STEPS_DAILY_COLLECTION_ID, [
    Query.equal("userId", user.$id),
    Query.greaterThanEqual("date", start.toISOString()),
    Query.lessThanEqual("date", end.toISOString()),
    Query.limit(1),
  ]);

  const docPayload = { userId: user.$id, date: date.toISOString(), ...payload };

  if (existing.documents.length > 0) {
    await databases.updateDocument(DATABASE_ID, STEPS_DAILY_COLLECTION_ID, existing.documents[0].$id, docPayload);
  } else {
    await databases.createDocument(
      DATABASE_ID,
      STEPS_DAILY_COLLECTION_ID,
      ID.unique(),
      docPayload,
      [
        Permission.read(Role.user(user.$id)),
        Permission.update(Role.user(user.$id)),
        Permission.delete(Role.user(user.$id)),
      ]
    );
  }
}

export async function getStepsGoal() {
  const user = await account.get();
  const res = await databases.listDocuments(DATABASE_ID, STEPS_GOALS_COLLECTION_ID, [
    Query.equal("userId", user.$id),
    Query.equal("goalStatus", "active"),
    Query.limit(1),
  ]);
  return res.documents[0] ?? null;
}

export async function saveStepsGoal(params: { targetSteps: number; goalStatus?: string }) {
  const user = await account.get();
  const goalStatus = params.goalStatus ?? "active";

  const existing = await databases.listDocuments(DATABASE_ID, STEPS_GOALS_COLLECTION_ID, [
    Query.equal("userId", user.$id),
    Query.equal("goalStatus", "active"),
    Query.limit(1),
  ]);

  if (existing.documents.length > 0) {
    await databases.updateDocument(DATABASE_ID, STEPS_GOALS_COLLECTION_ID, existing.documents[0].$id, {
      targetSteps: params.targetSteps,
      goalStatus,
    });
  } else {
    await databases.createDocument(
      DATABASE_ID,
      STEPS_GOALS_COLLECTION_ID,
      ID.unique(),
      {
        userId: user.$id,
        targetSteps: params.targetSteps,
        goalStatus,
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
      },
      [
        Permission.read(Role.user(user.$id)),
        Permission.update(Role.user(user.$id)),
        Permission.delete(Role.user(user.$id)),
      ]
    );
  }
}
