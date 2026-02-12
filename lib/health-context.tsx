import { createContext, useContext } from "react";
import { ID, Query, Permission, Role } from "react-native-appwrite";
import {
  databases,
  account,
  DATABASE_ID,
  STEPS_DAILY_COLLECTION_ID,
} from "./appwrite";

const DB_ID = "697ceba5002b026d89f2";
const HEALTH_LOGS = "health_logId";
const PERIOD_LOGS = "menstrualcycles";
const PCOS_LOGS = "pcos_logsId";
const CALORIE_GOALS = "calorie_goals";
const STEPS_GOALS = "steps_goals";
const NUTRITION_LOGS = "nutrition_logs";

type HealthContextType = {
  fetchMonthLogs: (date: Date) => Promise<any[]>;
  fetchAllLogs: () => Promise<any[]>;
  getDetailLog: (healthLogId: string, type: "PERIOD" | "PCOS") => Promise<any>;
  saveHealthLog: (params: { date: string; type: "PERIOD" | "PCOS"; payload: any }) => Promise<void>;

  getPeriodStats: (logs: any[]) => { 
    avgLength: number | null; 
    avgCycle:number | null;
    nextPeriodDate: Date | null };

  getTodayCalories: () => Promise<any | null>;
  saveTodayCalories: (params: {
    targetCalories: number;
    dailyCalories: number;
    burnedCalories?: number;
    burnedGoal?: number;
    burnedSource?: "steps" | "manual";
    goalStatus?: string; // ✅ CHANGED
  }) => Promise<void>;

  getStepsDaily: (start: Date, end: Date) => Promise<any[]>;
  saveStepsDaily: (date: Date, payload: any) => Promise<void>;

  getStepsGoal: () => Promise<any | null>;
  saveStepsGoal: (params: { targetSteps: number; goalStatus?: string }) => Promise<void>;

  getTodayNutrition: () => Promise<any | null>;
  saveTodayNutrition: (params: { carbs: number; fat: number; protein: number }) => Promise<void>;
};

const HealthContext = createContext<HealthContextType | undefined>(undefined);

// helpers
function addDays(d: Date, days: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}
function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}
function computePeriodStats(logs: any[]) {
  const periodDays = logs
    .filter((l) => String(l.type).toUpperCase() === "PERIOD")
    .map((l) => new Date(l.date))
    .sort((a, b) => a.getTime() - b.getTime());

  if (!periodDays.length) return { avgLength: null, avgCycle: null ,nextPeriodDate: null };

  const streaks: { start: Date; end: Date }[] = [];
  let start = periodDays[0];
  let prev = periodDays[0];

  for (let i = 1; i < periodDays.length; i++) {
    const curr = periodDays[i];
    if (daysBetween(prev, curr) === 1) {
      prev = curr;
    } else {
      streaks.push({ start, end: prev });
      start = curr;
      prev = curr;
    }
  }
  streaks.push({ start, end: prev });

  const lengths = streaks.map((s) => daysBetween(s.start, s.end) + 1);
  const avgLength = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);

  let avgCycle: number | null = null;
  if (streaks.length >= 2) {
    const diffs = [];
    for (let i = 1; i < streaks.length; i++) {
      diffs.push(daysBetween(streaks[i - 1].start, streaks[i].start));
    }
    avgCycle = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
  }

  const nextPeriodDate =
    avgCycle !== null ? addDays(streaks.at(-1)!.start, avgCycle) : null;

  return { avgLength, avgCycle, nextPeriodDate };
}

export function HealthProvider({ children }: { children: React.ReactNode }) {
  const fetchMonthLogs = async (date: Date) => {
    const user = await account.get();
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

    const res = await databases.listDocuments(DB_ID, HEALTH_LOGS, [
      Query.equal("userId", user.$id),
      Query.greaterThanEqual("date", start.toISOString()),
      Query.lessThanEqual("date", end.toISOString()),
    ]);

    return res.documents;
  };

  const fetchAllLogs = async () => {
    const user = await account.get();
    const res = await databases.listDocuments(DB_ID, HEALTH_LOGS, [
      Query.equal("userId", user.$id),
    ]);
    return res.documents;
  };

  const getDetailLog = async (healthLogId: string, type: "PERIOD" | "PCOS") => {
    const collection = type === "PERIOD" ? PERIOD_LOGS : PCOS_LOGS;

    const res = await databases.listDocuments(DB_ID, collection, [
      Query.equal("health_logId", healthLogId),
    ]);

    return res.documents[0] ?? null;
  };

  const saveHealthLog = async ({
    date,
    type,
    payload,
  }: {
    date: string;
    type: "PERIOD" | "PCOS";
    payload: any;
  }) => {
    const user = await account.get();

    const existing = await databases.listDocuments(DB_ID, HEALTH_LOGS, [
      Query.equal("userId", user.$id),
      Query.equal("date", date),
    ]);

    let healthLogId: string;

    if (existing.documents.length > 0) {
      healthLogId = existing.documents[0].$id;
    } else {
      const created = await databases.createDocument(
        DB_ID,
        HEALTH_LOGS,
        ID.unique(),
        { userId: user.$id, date, type },
        [
          Permission.read(Role.user(user.$id)),
          Permission.update(Role.user(user.$id)),
          Permission.delete(Role.user(user.$id)),
        ]
      );
      healthLogId = created.$id;
    }

    const collection = type === "PERIOD" ? PERIOD_LOGS : PCOS_LOGS;

    const existingDetail = await databases.listDocuments(DB_ID, collection, [
      Query.equal("health_logId", healthLogId),
    ]);

    if (existingDetail.documents.length > 0) {
      await databases.updateDocument(
        DB_ID,
        collection,
        existingDetail.documents[0].$id,
        { health_logId: healthLogId, ...payload }
      );
    } else {
      await databases.createDocument(
        DB_ID,
        collection,
        ID.unique(),
        { health_logId: healthLogId, ...payload },
        [
          Permission.read(Role.user(user.$id)),
          Permission.update(Role.user(user.$id)),
          Permission.delete(Role.user(user.$id)),
        ]
      );
    }
  };

  const getPeriodStats = (logs: any[]) => computePeriodStats(logs);

  const getTodayCalories = async () => {
    const user = await account.get();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const res = await databases.listDocuments(DB_ID, CALORIE_GOALS, [
      Query.equal("userId", user.$id),
      Query.greaterThanEqual("startDate", start.toISOString()),
      Query.lessThanEqual("endDate", end.toISOString()),
    ]);

    return res.documents[0] ?? null;
  };

  const saveTodayCalories = async ({
    targetCalories,
    dailyCalories,
    burnedCalories,
    burnedGoal,
    burnedSource = "manual",
    goalStatus = "active", // ✅ CHANGED
  }: {
    targetCalories: number;
    dailyCalories: number;
    burnedCalories?: number;
    burnedGoal?: number;
    burnedSource?: "steps" | "manual";
    goalStatus?: string; // ✅ CHANGED
  }) => {
    const user = await account.get();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const existing = await databases.listDocuments(DB_ID, CALORIE_GOALS, [
      Query.equal("userId", user.$id),
      Query.greaterThanEqual("startDate", start.toISOString()),
      Query.lessThanEqual("endDate", end.toISOString()),
    ]);

    const payload = {
      targetCalories,
      dailyCaloriesIntake: dailyCalories,
      burnedCalories: burnedCalories ?? 0,
      burnedGoal: burnedGoal ?? 0,
      burnedSource,
      goalStatus,
    };

    if (existing.documents.length > 0) {
      await databases.updateDocument(DB_ID, CALORIE_GOALS, existing.documents[0].$id, payload);
    } else {
      await databases.createDocument(
        DB_ID,
        CALORIE_GOALS,
        ID.unique(),
        {
          userId: user.$id,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          ...payload,
        },
        [
          Permission.read(Role.user(user.$id)),
          Permission.update(Role.user(user.$id)),
          Permission.delete(Role.user(user.$id)),
        ]
      );
    }
  };

  const getStepsDaily = async (start: Date, end: Date) => {
    const user = await account.get();
    const res = await databases.listDocuments(
      DATABASE_ID,
      STEPS_DAILY_COLLECTION_ID,
      [
        Query.equal("userId", user.$id),
        Query.greaterThanEqual("date", start.toISOString()),
        Query.lessThanEqual("date", end.toISOString()),
      ]
    );
    return res.documents;
  };

  const saveStepsDaily = async (date: Date, payload: any) => {
    const user = await account.get();
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const existing = await databases.listDocuments(
      DATABASE_ID,
      STEPS_DAILY_COLLECTION_ID,
      [
        Query.equal("userId", user.$id),
        Query.greaterThanEqual("date", start.toISOString()),
        Query.lessThanEqual("date", end.toISOString()),
      ]
    );

    if (existing.documents.length > 0) {
      await databases.updateDocument(
        DATABASE_ID,
        STEPS_DAILY_COLLECTION_ID,
        existing.documents[0].$id,
        { userId: user.$id, date: date.toISOString(), ...payload }
      );
    } else {
      await databases.createDocument(
        DATABASE_ID,
        STEPS_DAILY_COLLECTION_ID,
        ID.unique(),
        { userId: user.$id, date: date.toISOString(), ...payload },
        [
          Permission.read(Role.user(user.$id)),
          Permission.update(Role.user(user.$id)),
          Permission.delete(Role.user(user.$id)),
        ]
      );
    }
  };

  const getTodayNutrition = async () => {
    const user = await account.get();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const res = await databases.listDocuments(DB_ID, NUTRITION_LOGS, [
      Query.equal("userId", user.$id),
      Query.greaterThanEqual("date", start.toISOString()),
      Query.lessThanEqual("date", end.toISOString()),
    ]);

    return res.documents[0] ?? null;
  };

  const saveTodayNutrition = async ({
    carbs,
    fat,
    protein,
  }: {
    carbs: number;
    fat: number;
    protein: number;
  }) => {
    const user = await account.get();
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const existing = await databases.listDocuments(DB_ID, NUTRITION_LOGS, [
      Query.equal("userId", user.$id),
      Query.greaterThanEqual("date", start.toISOString()),
      Query.lessThanEqual("date", new Date().toISOString()),
    ]);

    const payload = { userId: user.$id, date: start.toISOString(), carbs, fat, protein };

    if (existing.documents.length > 0) {
      await databases.updateDocument(DB_ID, NUTRITION_LOGS, existing.documents[0].$id, payload);
    } else {
      await databases.createDocument(DB_ID, NUTRITION_LOGS, ID.unique(), payload, [
        Permission.read(Role.user(user.$id)),
        Permission.update(Role.user(user.$id)),
        Permission.delete(Role.user(user.$id)),
      ]);
    }
  };

  const getStepsGoal = async () => {
    const user = await account.get();
    const res = await databases.listDocuments(DB_ID, STEPS_GOALS, [
      Query.equal("userId", user.$id),
      Query.equal("goalStatus", "active"),
    ]);
    return res.documents[0] ?? null;
  };

  const saveStepsGoal = async ({
    targetSteps,
    goalStatus = "active",
  }: {
    targetSteps: number;
    goalStatus?: string;
  }) => {
    const user = await account.get();

    const existing = await databases.listDocuments(DB_ID, STEPS_GOALS, [
      Query.equal("userId", user.$id),
      Query.equal("goalStatus", "active"),
    ]);

    if (existing.documents.length > 0) {
      await databases.updateDocument(DB_ID, STEPS_GOALS, existing.documents[0].$id, {
        targetSteps,
        goalStatus,
      });
    } else {
      await databases.createDocument(
        DB_ID,
        STEPS_GOALS,
        ID.unique(),
        {
          userId: user.$id,
          targetSteps,
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
  };

  return (
    <HealthContext.Provider
      value={{
        fetchMonthLogs,
        fetchAllLogs,
        getDetailLog,
        saveHealthLog,
        getPeriodStats,
        getTodayCalories,
        saveTodayCalories,
        getStepsDaily,
        saveStepsDaily,
        getStepsGoal,
        saveStepsGoal,
        getTodayNutrition,
        saveTodayNutrition,
      }}
    >
      {children}
    </HealthContext.Provider>
  );
}

export function useHealth() {
  const context = useContext(HealthContext);
  if (!context) {
    throw new Error("useHealth must be used inside HealthProvider");
  }
  return context;
}
