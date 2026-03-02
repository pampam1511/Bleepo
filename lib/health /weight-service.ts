import { ID, Permission, Query, Role } from "react-native-appwrite";
import { account, databases, DATABASE_ID } from "@/lib/appwrite";

const WEIGHT_LOGS_COLLECTION_ID =
  process.env.EXPO_PUBLIC_WEIGHT_LOGS_COLLECTION_ID ?? "weight_logs";

export function calculateBMI(weightKg: number, heightCm: number): number {
  if (!heightCm || !weightKg) return 0;
  const heightM = heightCm / 100;
  return parseFloat((weightKg / (heightM * heightM)).toFixed(1));
}

export function bmiCategory(bmi: number): string {
  if (bmi === 0) return "—";
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

export async function logWeight(weightKg: number, heightCm: number, note?: string) {
  try {
    const user = await account.get();
    const bmi = calculateBMI(weightKg, heightCm);
    await databases.createDocument(
      DATABASE_ID,
      WEIGHT_LOGS_COLLECTION_ID,
      ID.unique(),
      {
        userId: user.$id,
        date: new Date().toISOString(),
        weightKg,
        bmi,
        note: note ?? null,
      },
      [
        Permission.read(Role.user(user.$id)),
        Permission.update(Role.user(user.$id)),
        Permission.delete(Role.user(user.$id)),
      ]
    );
  } catch (err) {
    console.error("logWeight failed:", err);
  }
}

export async function getWeightLogs(limitDays = 60) {
  try {
    const user = await account.get();
    const start = new Date();
    start.setDate(start.getDate() - limitDays);
    const res = await databases.listDocuments(DATABASE_ID, WEIGHT_LOGS_COLLECTION_ID, [
      Query.equal("userId", user.$id),
      Query.greaterThanEqual("date", start.toISOString()),
      Query.orderAsc("date"),
    ]);
    return res.documents;
  } catch (err) {
    console.error("getWeightLogs failed:", err);
    return [];
  }
}