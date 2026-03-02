import { ID, Permission, Query, Role } from "react-native-appwrite";
import {
  account,
  databases,
  DATABASE_ID,
  HEALTHLOG_COLLECTION_ID,
  PERIOD_LOGS_COLLECTION_ID,
  PCOS_LOGS_COLLECTION_ID,
} from "@/lib/appwrite";

function addDays(d: Date, days: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function daysBetween(a: Date, b: Date) {
  const aMid = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bMid = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((bMid - aMid) / 86400000);
}

function toLocalDayKey(dateLike: string | Date) {
  const d = new Date(dateLike);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromLocalDayKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export async function fetchMonthLogs(date: Date) {
  const user = await account.get();
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

  const res = await databases.listDocuments(DATABASE_ID, HEALTHLOG_COLLECTION_ID, [
    Query.equal("userId", user.$id),
    Query.greaterThanEqual("date", start.toISOString()),
    Query.lessThanEqual("date", end.toISOString()),
  ]);

  return res.documents;
}

export async function fetchAllLogs() {
  const user = await account.get();
  const res = await databases.listDocuments(DATABASE_ID, HEALTHLOG_COLLECTION_ID, [
    Query.equal("userId", user.$id),
  ]);
  return res.documents;
}


export async function getDetailLog(healthLogId: string, type: "PERIOD" | "PCOS") {
  const collection = type === "PERIOD" ? PERIOD_LOGS_COLLECTION_ID : PCOS_LOGS_COLLECTION_ID;
  const res = await databases.listDocuments(DATABASE_ID, collection, [
    Query.equal("health_logId", healthLogId),
    Query.limit(1),
  ]);
  return res.documents[0] ?? null;
}

export async function saveHealthLog(params: {
  date: string;
  type: "PERIOD" | "PCOS";
  payload: any;
}) {
  const { date, type, payload } = params;
  const user = await account.get();

  const existing = await databases.listDocuments(DATABASE_ID, HEALTHLOG_COLLECTION_ID, [
    Query.equal("userId", user.$id),
    Query.equal("date", date),
    Query.equal("type", type),
    Query.limit(1),
  ]);

  let healthLogId: string;
  if (existing.documents.length > 0) {
    healthLogId = existing.documents[0].$id;
  } else {
    const created = await databases.createDocument(
      DATABASE_ID,
      HEALTHLOG_COLLECTION_ID,
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

  const detailCollection = type === "PERIOD" ? PERIOD_LOGS_COLLECTION_ID : PCOS_LOGS_COLLECTION_ID;
  const detailExisting = await databases.listDocuments(DATABASE_ID, detailCollection, [
    Query.equal("health_logId", healthLogId),
    Query.limit(1),
  ]);

  const detailPayload = { health_logId: healthLogId, ...payload };

  if (detailExisting.documents.length > 0) {
    await databases.updateDocument(
      DATABASE_ID,
      detailCollection,
      detailExisting.documents[0].$id,
      detailPayload
    );
  } else {
    await databases.createDocument(
      DATABASE_ID,
      detailCollection,
      ID.unique(),
      detailPayload,
      [
        Permission.read(Role.user(user.$id)),
        Permission.update(Role.user(user.$id)),
        Permission.delete(Role.user(user.$id)),
      ]
    );
  }
}

const DEFAULT_CYCLE_LENGTH = 28;

// Uses log.date (one entry per day the user logged) to build streaks.
// e.g. 5 logs on Feb 22–26 = one streak of 5 days = avgLength 5. ✅
export function computePeriodStats(logs: any[]) {
  const todayKey = toLocalDayKey(new Date());

  // Build list of unique period days from log.date (plain health log dates)
  const periodDays = logs
    .filter((l) => String(l.type).toUpperCase() === "PERIOD")
    .map((l) => toLocalDayKey(l.date))
    .filter((k) => k <= todayKey)
    .filter((k, i, arr) => arr.indexOf(k) === i) // deduplicate
    .map(fromLocalDayKey)
    .sort((a, b) => a.getTime() - b.getTime());

  if (!periodDays.length) {
    return {
      avgLength: null,
      avgCycle: null,
      nextPeriodDate: null,
      ovulationDate: null,
      fertileStart: null,
      fertileEnd: null,
      cycleRange: null,
    };
  }

  // Build streaks of consecutive days
  const streaks: { start: Date; end: Date }[] = [];
  let start = periodDays[0];
  let prev = periodDays[0];

  for (let i = 1; i < periodDays.length; i++) {
    const curr = periodDays[i];
    if (daysBetween(prev, curr) <= 1) {
      prev = curr;
    } else {
      streaks.push({ start, end: prev });
      start = curr;
      prev = curr;
    }
  }
  streaks.push({ start, end: prev });

  // Average period length from streak durations
  const lengths = streaks.map((s) => daysBetween(s.start, s.end) + 1);
  const avgLength = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);

  // Average cycle length and cycle range
  let avgCycle: number;
  let cycleRange: { early: Date; late: Date } | null = null;

  if (streaks.length >= 2) {
    const diffs = streaks
      .slice(1)
      .map((s, i) => daysBetween(streaks[i].start, s.start))
      .filter((d) => d >= 15 && d <= 45);

    if (diffs.length) {
      avgCycle = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
      cycleRange = {
        early: addDays(streaks.at(-1)!.start, Math.min(...diffs)),
        late: addDays(streaks.at(-1)!.start, Math.max(...diffs)),
      };
    } else {
      avgCycle = DEFAULT_CYCLE_LENGTH;
    }
  } else {
    // Single streak — use default cycle with ±3 day estimated range
    avgCycle = DEFAULT_CYCLE_LENGTH;
    cycleRange = {
      early: addDays(streaks[0].start, avgCycle - 3),
      late: addDays(streaks[0].start, avgCycle + 3),
    };
  }

  const lastStart = streaks.at(-1)!.start;
  const nextPeriodDate = addDays(lastStart, avgCycle);
  const ovulationDate = avgCycle >= 21 ? addDays(lastStart, avgCycle - 14) : null;
  const fertileStart = ovulationDate ? addDays(ovulationDate, -5) : null;
  const fertileEnd = ovulationDate ? addDays(ovulationDate, 1) : null;

  return {
    avgLength,
    avgCycle,
    nextPeriodDate,
    ovulationDate,
    fertileStart,
    fertileEnd,
    cycleRange,
  };
}