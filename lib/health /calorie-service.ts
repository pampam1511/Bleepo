import { ID, Permission, Query, Role } from "react-native-appwrite";
import {
  account,
  databases,
  DATABASE_ID,
  CALORIE_GOALS_COLLECTION_ID,
  NUTRITION_LOGS_COLLECTION_ID,
} from "@/lib/appwrite";

export async function getTodayCalories() {
  const user = await account.get();
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);

  const res = await databases.listDocuments(DATABASE_ID, CALORIE_GOALS_COLLECTION_ID, [
    Query.equal("userId", user.$id),
    Query.greaterThanEqual("startDate", start.toISOString()),
    Query.lessThanEqual("endDate", end.toISOString()),
    Query.limit(1),
  ]);

  return res.documents[0] ?? null;
}

export async function saveTodayCalories(params: {
  targetCalories: number;
  dailyCalories: number;
  burnedCalories?: number;
  burnedGoal?: number;
  burnedSource?: "steps" | "manual";
  goalStatus?: string;
}) {
  const user = await account.get();
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);

  const existing = await databases.listDocuments(DATABASE_ID, CALORIE_GOALS_COLLECTION_ID, [
    Query.equal("userId", user.$id),
    Query.greaterThanEqual("startDate", start.toISOString()),
    Query.lessThanEqual("endDate", end.toISOString()),
    Query.limit(1),
  ]);

  const payload = {
    targetCalories: params.targetCalories,
    dailyCaloriesIntake: params.dailyCalories,
    burnedCalories: params.burnedCalories ?? 0,
    burnedGoal: params.burnedGoal ?? 0,
    burnedSource: params.burnedSource ?? "manual",
    goalStatus: params.goalStatus ?? "active",
  };

  if (existing.documents.length > 0) {
    await databases.updateDocument(DATABASE_ID, CALORIE_GOALS_COLLECTION_ID, existing.documents[0].$id, payload);
  } else {
    await databases.createDocument(
      DATABASE_ID,
      CALORIE_GOALS_COLLECTION_ID,
      ID.unique(),
      { userId: user.$id, startDate: start.toISOString(), endDate: end.toISOString(), ...payload },
      [
        Permission.read(Role.user(user.$id)),
        Permission.update(Role.user(user.$id)),
        Permission.delete(Role.user(user.$id)),
      ]
    );
  }
}

export async function getCaloriesRange(start: Date, end: Date) {
  const user = await account.get();
  const res = await databases.listDocuments(DATABASE_ID, CALORIE_GOALS_COLLECTION_ID, [
    Query.equal("userId", user.$id),
    Query.greaterThanEqual("startDate", start.toISOString()),
    Query.lessThanEqual("endDate", end.toISOString()),
  ]);
  return res.documents;
}

export async function getTodayNutrition() {
  const user = await account.get();
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);

  const res = await databases.listDocuments(DATABASE_ID, NUTRITION_LOGS_COLLECTION_ID, [
    Query.equal("userId", user.$id),
    Query.greaterThanEqual("date", start.toISOString()),
    Query.lessThanEqual("date", end.toISOString()),
    Query.limit(1),
  ]);

  return res.documents[0] ?? null;
}

export async function saveTodayNutrition(params: { carbs: number; fat: number; protein: number }) {
  const user = await account.get();
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);

  const existing = await databases.listDocuments(DATABASE_ID, NUTRITION_LOGS_COLLECTION_ID, [
    Query.equal("userId", user.$id),
    Query.greaterThanEqual("date", start.toISOString()),
    Query.lessThanEqual("date", end.toISOString()),
    Query.limit(1),
  ]);

  const payload = { userId: user.$id, date: start.toISOString(), ...params };

  if (existing.documents.length > 0) {
    await databases.updateDocument(DATABASE_ID, NUTRITION_LOGS_COLLECTION_ID, existing.documents[0].$id, payload);
  } else {
    await databases.createDocument(
      DATABASE_ID,
      NUTRITION_LOGS_COLLECTION_ID,
      ID.unique(),
      payload,
      [
        Permission.read(Role.user(user.$id)),
        Permission.update(Role.user(user.$id)),
        Permission.delete(Role.user(user.$id)),
      ]
    );
  }
}
