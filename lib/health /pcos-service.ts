import { ID, Query, Permission, Role } from "react-native-appwrite";
import { account, databases, DATABASE_ID } from "@/lib/appwrite";

// ─── Collection IDs ───────────────────────────────────────────────────────────
const PCOS_LOGS_COLLECTION_ID   = process.env.EXPO_PUBLIC_PCOS_LOGS_COLLECTION_ID!;
const STEPS_DAILY_COLLECTION_ID = process.env.EXPO_PUBLIC_STEPS_DAILY_COLLECTION_ID!;
const WEIGHT_LOGS_COLLECTION_ID = process.env.EXPO_PUBLIC_WEIGHT_LOGS_COLLECTION_ID!;

// ─── Types ────────────────────────────────────────────────────────────────────

export type PCOSPayload = {
  painLevel:           number;       // 1–5
  moods:               string[];     // emoji array
  bloating:            number;       // 1–5
  facialhair:          boolean;
  stressLevel:         number;       // 1–5
  acne_levels:         "none" | "mild" | "moderate" | "severe";
  fatigue:             number;       // 1–5
  increased_appetite:  number;       // 1–5
  hairloss?:           boolean;
  irregularBleeding?:  boolean;
  headache?:           boolean;
};

export type PCOSLog = PCOSPayload & {
  $id:    string;
  date:   string;
  userId: string;
};

export type PCOSTrends = {
  totalLogs:         number;
  avgPain:           number;
  avgFatigue:        number;
  avgBloating:       number;
  avgStress:         number;
  avgAppetite:       number;
  dominantMood:      string;
  symptomFrequency:  Record<string, number>;   // key → % of days (0–100)
  weeklyLoad:        { label: string; count: number }[];  // last 8 weeks
  insight:           string;
  streak:            number;          // consecutive days logged
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toDateKey = (iso: string) => iso.slice(0, 10);

const avg = (logs: PCOSLog[], key: keyof PCOSLog): number => {
  if (!logs.length) return 0;
  const sum = logs.reduce((s, l) => s + (Number(l[key]) || 0), 0);
  return Math.round((sum / logs.length) * 10) / 10;
};

const pickInsight = (trends: Omit<PCOSTrends, "insight">): string => {
  if (trends.avgStress >= 4)
    return "Your stress levels are consistently high. Elevated cortisol can worsen PCOS symptoms. Short walks, breathwork, or journalling may help regulate it.";
  if (trends.avgFatigue >= 4)
    return "Fatigue is your most logged symptom. Low iron and insulin resistance are common PCOS triggers — consider speaking with your provider about testing.";
  if (trends.avgBloating >= 4)
    return "Frequent bloating may signal inflammation. Anti-inflammatory foods like leafy greens, berries, and omega-3s have shown benefit in PCOS research.";
  if ((trends.symptomFrequency["acne"] ?? 0) >= 50)
    return "Acne appearing on more than half your logged days may indicate elevated androgens — a hallmark of PCOS. Tracking alongside your cycle can help identify patterns.";
  if (trends.streak >= 7)
    return `Great consistency! You've logged ${trends.streak} days in a row. The more you track, the more personalised your insights become.`;
  if (trends.totalLogs < 5)
    return "Keep logging to unlock personalised PCOS insights. Just 2 weeks of data reveals meaningful patterns.";
  return "Your symptoms look relatively stable. Continue logging consistently so your provider can see trends over time.";
};

// ─── Core CRUD ────────────────────────────────────────────────────────────────

/**
 * Create or update a PCOS log for a given date.
 * If a log already exists for that date it is overwritten.
 */
export const savePCOSLog = async (date: string, payload: PCOSPayload): Promise<void> => {
  const user = await account.get();
  const dateKey = toDateKey(date);

  const existing = await databases.listDocuments(DATABASE_ID, PCOS_LOGS_COLLECTION_ID, [
    Query.equal("userId", user.$id),
    Query.equal("dateKey", dateKey),
    Query.limit(1),
  ]);

  const data = {
    userId:             user.$id,
    date,
    dateKey,
    painLevel:          payload.painLevel,
    moods:              payload.moods,
    bloating:           payload.bloating,
    facialhair:         payload.facialhair,
    stressLevel:        payload.stressLevel,
    acne_levels:        payload.acne_levels,
    fatigue:            payload.fatigue,
    increased_appetite: payload.increased_appetite,
    hairloss:           payload.hairloss           ?? false,
    irregularBleeding:  payload.irregularBleeding  ?? false,
    headache:           payload.headache            ?? false,
    updatedAt:          new Date().toISOString(),
  };

  if (existing.documents.length > 0) {
    await databases.updateDocument(DATABASE_ID, PCOS_LOGS_COLLECTION_ID, existing.documents[0].$id, data);
  } else {
    await databases.createDocument(
      DATABASE_ID, PCOS_LOGS_COLLECTION_ID, ID.unique(), data,
      [
        Permission.read(Role.user(user.$id)),
        Permission.update(Role.user(user.$id)),
        Permission.delete(Role.user(user.$id)),
      ]
    );
  }
};

/**
 * Fetch a single PCOS log by date.
 */
export const getPCOSLog = async (date: string): Promise<PCOSLog | null> => {
  try {
    const user    = await account.get();
    const dateKey = toDateKey(date);
    const res     = await databases.listDocuments(DATABASE_ID, PCOS_LOGS_COLLECTION_ID, [
      Query.equal("userId", user.$id),
      Query.equal("dateKey", dateKey),
      Query.limit(1),
    ]);
    return (res.documents[0] as unknown as PCOSLog) ?? null;
  } catch (e) {
    console.error("getPCOSLog failed:", e);
    return null;
  }
};

/**
 * Fetch all PCOS logs within a date range, ordered oldest → newest.
 */
export const getPCOSLogs = async (startDate: Date, endDate: Date): Promise<PCOSLog[]> => {
  try {
    const user = await account.get();
    const res  = await databases.listDocuments(DATABASE_ID, PCOS_LOGS_COLLECTION_ID, [
      Query.equal("userId", user.$id),
      Query.greaterThanEqual("date", startDate.toISOString()),
      Query.lessThanEqual("date", endDate.toISOString()),
      Query.orderAsc("date"),
      Query.limit(5000),
    ]);
    return res.documents as unknown as PCOSLog[];
  } catch (e) {
    console.error("getPCOSLogs failed:", e);
    return [];
  }
};

// ─── Trends Engine ────────────────────────────────────────────────────────────

/**
 * Compute all trend data needed for the PCOS trends panel.
 * Pass limitDays to control the analysis window (default 90).
 */
export const getPCOSTrends = async (limitDays = 90): Promise<PCOSTrends> => {
  const end   = new Date();
  const start = new Date(); start.setDate(start.getDate() - limitDays);

  const allLogs = await getPCOSLogs(start, end);
  const total   = allLogs.length;

  if (total === 0) {
    return {
      totalLogs:        0,
      avgPain:          0,
      avgFatigue:       0,
      avgBloating:      0,
      avgStress:        0,
      avgAppetite:      0,
      dominantMood:     "😐",
      symptomFrequency: {},
      weeklyLoad:       [],
      streak:           0,
      insight:          "Keep logging to unlock personalised PCOS insights. Just 2 weeks of data reveals meaningful patterns.",
    };
  }

  // ── Averages ────────────────────────────────────────────────────────────────
  const avgPain     = avg(allLogs, "painLevel");
  const avgFatigue  = avg(allLogs, "fatigue");
  const avgBloating = avg(allLogs, "bloating");
  const avgStress   = avg(allLogs, "stressLevel");
  const avgAppetite = avg(allLogs, "increased_appetite");

  // ── Dominant mood ───────────────────────────────────────────────────────────
  const moodCounts: Record<string, number> = {};
  allLogs.forEach((l) => {
    (l.moods ?? []).forEach((m: string) => { moodCounts[m] = (moodCounts[m] ?? 0) + 1; });
  });
  const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "😐";

  // ── Symptom frequency (% of days) ──────────────────────────────────────────
  const rawCounts: Record<string, number> = {
    acne:            0,
    hairloss:        0,
    bloating:        0,
    fatigue:         0,
    cramps:          0,
    moodswings:      0,
    irregularbleed:  0,
    headache:        0,
  };

  allLogs.forEach((l) => {
    if (l.acne_levels && l.acne_levels !== "none")  rawCounts.acne++;
    if (l.hairloss || l.facialhair)                  rawCounts.hairloss++;
    if (l.bloating > 3)                              rawCounts.bloating++;
    if (l.fatigue  > 3)                              rawCounts.fatigue++;
    if (l.painLevel > 3)                             rawCounts.cramps++;
    if (l.stressLevel > 3)                           rawCounts.moodswings++;
    if (l.irregularBleeding)                         rawCounts.irregularbleed++;
    if (l.headache)                                  rawCounts.headache++;
  });

  const symptomFrequency: Record<string, number> = {};
  Object.entries(rawCounts).forEach(([k, v]) => {
    symptomFrequency[k] = total > 0 ? Math.round((v / total) * 100) : 0;
  });

  // ── Weekly load (last 8 weeks) ──────────────────────────────────────────────
  const weeklyLoad: { label: string; count: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const wEnd   = new Date(); wEnd.setDate(wEnd.getDate() - i * 7);
    const wStart = new Date(wEnd); wStart.setDate(wStart.getDate() - 6);
    const label  = `W${8 - i}`;

    const weekLogs = allLogs.filter((l) => {
      const d = new Date(l.date);
      return d >= wStart && d <= wEnd;
    });

    const count = weekLogs.reduce((s, l) => {
      let c = 0;
      if (l.acne_levels && l.acne_levels !== "none") c++;
      if (l.fatigue  > 3)    c++;
      if (l.bloating > 3)    c++;
      if (l.facialhair)      c++;
      if (l.stressLevel > 3) c++;
      if (l.irregularBleeding) c++;
      if (l.headache)        c++;
      return s + c;
    }, 0);

    weeklyLoad.push({ label, count });
  }

  // ── Streak (consecutive logged days ending today) ───────────────────────────
  const loggedDayKeys = new Set(allLogs.map((l) => toDateKey(l.date)));
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = toDateKey(cursor.toISOString());
    if (!loggedDayKeys.has(key)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const trendsWithoutInsight = {
    totalLogs: total, avgPain, avgFatigue, avgBloating, avgStress, avgAppetite,
    dominantMood, symptomFrequency, weeklyLoad, streak,
  };

  return {
    ...trendsWithoutInsight,
    insight: pickInsight(trendsWithoutInsight),
  };
};

/**
 * Fetch PCOS streak only (lightweight, used for home screen summary).
 */
export const getPCOSStreak = async (): Promise<number> => {
  try {
    const end   = new Date();
    const start = new Date(); start.setDate(start.getDate() - 90);
    const logs  = await getPCOSLogs(start, end);
    const keys  = new Set(logs.map((l) => toDateKey(l.date)));

    let streak = 0;
    const cursor = new Date();
    while (true) {
      if (!keys.has(toDateKey(cursor.toISOString()))) break;
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  } catch (e) {
    return 0;
  }
};