import { useHealth } from "@/lib/health /health-context";
import { useRouter } from "expo-router";
import { Pedometer } from "expo-sensors";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {AppState,AppStateStatus,Dimensions,Modal,ScrollView,StyleSheet,Text,TextInput,TouchableOpacity,View,} from "react-native";

const SCREEN_W = Dimensions.get("window").width;
const WEEKDAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const stepsToDistanceKm = (steps: number) => steps * 0.0008;
const stepsToCalories   = (steps: number) => steps * 0.04;
const stepsToMinutes    = (steps: number) => steps / 100;

function startOfWeek(d: Date) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - copy.getDay());
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getPastWeekStarts(count: number): Date[] {
  const base = startOfWeek(new Date());
  return Array.from({ length: count }).map((_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() - i * 7);
    return d;
  });
}

export default function StepsScreen() {
  const router = useRouter();
  const {
    getStepsDaily,
    getStepsGoal,
    saveStepsGoal,
    saveStepsDaily,
    getTodayCalories,
    saveTodayCalories,
  } = useHealth();

  const [selectedDay,      setSelectedDay]      = useState<string | null>(null);
  const [mode,             setMode]             = useState<"DAILY" | "WEEKLY" | "MONTHLY">("DAILY");
  const [dailyLogs,        setDailyLogs]        = useState<any[]>([]);
  const [pastStepCount,    setPastStepCount]    = useState(0);
  const [currentStepCount, setCurrentStepCount] = useState(0);
  const [goal,             setGoal]             = useState("10000");
  const [goalModal,        setGoalModal]        = useState(false);

  // AppState handler always sees latest step count
  // without needing to be re-registered every time totalSteps changes
  const totalStepsRef = useRef(0);

  const weekStarts = useMemo(() => getPastWeekStarts(12), []);
  const [weekIndex, setWeekIndex] = useState(0);

  const weekLabel = weekStarts[weekIndex]
    ? weekStarts[weekIndex].toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : "";

  const totalSteps = pastStepCount + currentStepCount;

  // keep ref in sync so AppState handler can read latest value
  useEffect(() => {
    totalStepsRef.current = totalSteps;
  }, [totalSteps]);

  const persistSteps = useCallback(
    async (steps: number) => {
      if (steps <= 0) return; // don't save 0-step entries
      try {
        const now = new Date();
        await saveStepsDaily(now, {
          steps,
          timeMinutes:    Math.round(stepsToMinutes(steps)),
          distanceKm:     Number(stepsToDistanceKm(steps).toFixed(2)),
          caloriesBurned: Math.round(stepsToCalories(steps)),
        });

        const calDoc = await getTodayCalories();
        await saveTodayCalories({
          targetCalories: calDoc?.targetCalories      ?? 0,
          dailyCalories:  calDoc?.dailyCaloriesIntake ?? 0,
          burnedCalories: Math.round(stepsToCalories(steps)),
          burnedGoal:     calDoc?.burnedGoal          ?? 0,
          burnedSource:   "steps",
          goalStatus:     calDoc?.goalStatus          ?? "active",
        });
      } catch (err) {
        console.error("persistSteps failed:", err);
      }
    },
    [saveStepsDaily, getTodayCalories, saveTodayCalories]
  );

  const loadDailyLogs = useCallback(async () => {
    try {
      const start = new Date();
      start.setDate(start.getDate() - 365);
      const end  = new Date();
      const logs = await getStepsDaily(start, end);
      setDailyLogs(logs);
    } catch (err) {
      console.error("loadDailyLogs failed:", err);
    }
  }, [getStepsDaily]);

  // ── Pedometer setup ───────────────────────────────────────────────────────
  useEffect(() => {
    let sub: any;
    const subscribe = async () => {
      try {
        const available = await Pedometer.isAvailableAsync();
        if (!available) return;

        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const past = await Pedometer.getStepCountAsync(start, new Date());
        setPastStepCount(past.steps);

        sub = Pedometer.watchStepCount((result) => {
          setCurrentStepCount(result.steps);
        });
      } catch (err) {
        console.error("Pedometer setup failed:", err);
      }
    };
    subscribe();
    return () => { sub && sub.remove(); };
  }, []);

  // ── Save on mount once pedometer data arrives ─────────────────────────────
  useEffect(() => {
    if (pastStepCount > 0) {
      persistSteps(pastStepCount + currentStepCount);
    }
  }, [pastStepCount]);

  // ── Save every 5 minutes ──────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(async () => {
      await persistSteps(totalStepsRef.current);
      await loadDailyLogs();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [persistSteps, loadDailyLogs]); 

  //  Save when app goes to background (user presses home button, switches apps, etc.)
  // closed the app between the 5-minute saves.
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState === "background" || nextState === "inactive") {
        await persistSteps(totalStepsRef.current);
      }
      //  Reload logs when app comes back to foreground so chart is fresh
      if (nextState === "active") {
        await loadDailyLogs();
      }
    };

    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => sub.remove();
  }, [persistSteps, loadDailyLogs]);

  // ── Load logs + goal on mount ─────────────────────────────────────────────
  useEffect(() => { loadDailyLogs(); }, []);

  // ── Backfill past 7 days from pedometer on first load ─────────────────────
  // Runs once after dailyLogs first populates. Reads step counts for each of
  // the last 7 days directly from the device (Apple Health on iOS) and saves
  // any days that aren't already in Appwrite.
  const hasBackfilled = useRef(false);
  useEffect(() => {
    if (hasBackfilled.current) return;   // only ever run once per session
    if (dailyLogs === null) return;      // wait for initial load

    const backfill = async () => {
      try {
        const available = await Pedometer.isAvailableAsync();
        if (!available) return;

        let didSaveAny = false;

        for (let i = 1; i <= 7; i++) {
          const dayStart = new Date();
          dayStart.setDate(dayStart.getDate() - i);
          dayStart.setHours(0, 0, 0, 0);

          const dayEnd = new Date(dayStart);
          dayEnd.setHours(23, 59, 59, 999);

          const key = dayStart.toISOString().slice(0, 10);
          const alreadySaved = dailyLogs.some((l) => l.date?.slice(0, 10) === key);
          if (alreadySaved) continue; // skip days we already have

          try {
            const result = await Pedometer.getStepCountAsync(dayStart, dayEnd);
            if (result.steps > 0) {
              await saveStepsDaily(dayStart, {
                steps:          result.steps,
                timeMinutes:    Math.round(stepsToMinutes(result.steps)),
                distanceKm:     Number(stepsToDistanceKm(result.steps).toFixed(2)),
                caloriesBurned: Math.round(stepsToCalories(result.steps)),
              });
              didSaveAny = true;
            }
          } catch (_) {
            // Device may not have data for this day — skip silently
          }
        }

        if (didSaveAny) await loadDailyLogs(); // refresh chart only if we saved something
      } catch (err) {
        console.error("backfill failed:", err);
      } finally {
        hasBackfilled.current = true;
      }
    };

    backfill();
  }, [dailyLogs.length]); // triggers once after first load populates dailyLogs

  useEffect(() => {
    const loadGoal = async () => {
      try {
        const doc = await getStepsGoal();
        if (doc?.targetSteps) setGoal(String(doc.targetSteps));
      } catch (err) {
        console.error("loadGoal failed:", err);
      }
    };
    loadGoal();
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────
  const goalNum      = Math.max(1, Number(goal || 0));
  const progress     = Math.min(1, totalSteps / goalNum);
  const progressWidth = Math.round(progress * 100);

  const selectedLog = useMemo(
    () => selectedDay ? dailyLogs.find((x) => x.date?.slice(0, 10) === selectedDay) : null,
    [dailyLogs, selectedDay]
  );

  const displayStats = selectedLog
    ? {
        steps:    selectedLog.steps         ?? 0,
        time:     selectedLog.timeMinutes   ?? 0,
        distance: selectedLog.distanceKm    ?? 0,
        calories: selectedLog.caloriesBurned ?? 0,
      }
    : (() => {
        const sorted = [...dailyLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const slice  = mode === "MONTHLY" ? sorted.slice(-30) : sorted.slice(-7);
        return {
          steps:    slice.reduce((s, x) => s + (x.steps         ?? 0), 0),
          time:     slice.reduce((s, x) => s + (x.timeMinutes   ?? 0), 0),
          distance: slice.reduce((s, x) => s + (x.distanceKm    ?? 0), 0),
          calories: slice.reduce((s, x) => s + (x.caloriesBurned ?? 0), 0),
        };
      })();

  const chartData = useMemo(() => {
    if (!dailyLogs.length) return { labels: [] as string[], values: [] as number[] };

    const sorted = [...dailyLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (mode === "DAILY") {
      const last7 = sorted.slice(-7);
      return {
        labels: last7.map((l) => WEEKDAY_LABELS[new Date(l.date).getDay()].slice(0, 1)),
        values: last7.map((l) => l.steps ?? 0),
      };
    }

    if (mode === "WEEKLY") {
      const weekTotals: Record<string, number> = {};
      sorted.slice(-28).forEach((l) => {
        const key = startOfWeek(new Date(l.date)).toISOString().slice(0, 10);
        weekTotals[key] = (weekTotals[key] ?? 0) + (l.steps ?? 0);
      });
      const weeks = Object.entries(weekTotals).sort(([a], [b]) => a.localeCompare(b)).slice(-4);
      return {
        labels: weeks.map(([date]) => { const d = new Date(date); return `${d.getDate()}/${d.getMonth() + 1}`; }),
        values: weeks.map(([, v]) => v),
      };
    }

    const months = Array(12).fill(0);
    sorted.forEach((l) => { months[new Date(l.date).getMonth()] += l.steps ?? 0; });
    return {
      labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      values: months,
    };
  }, [dailyLogs, mode]);

  const maxBar = Math.max(...chartData.values, 1);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={() => router.push("/")} style={styles.backBtn}>
        <Text style={styles.backTxt}>← Back to Home</Text>
      </TouchableOpacity>

      <View style={styles.titleRow}>
        <Text style={styles.title}>Steps</Text>
        <View style={styles.weekPill}>
          <Text style={styles.weekPillTxt}>{weekLabel}</Text>
        </View>
      </View>

      {/* Week strip */}
      <View style={styles.weekStrip}>
        <ScrollView
          horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          onScroll={(e) => setWeekIndex(Math.round(e.nativeEvent.contentOffset.x / (SCREEN_W - 36)))}
          scrollEventThrottle={16}
        >
          {weekStarts.map((weekStart, idx) => {
            const days = Array.from({ length: 7 }).map((_, i) => {
              const d   = new Date(weekStart);
              d.setDate(weekStart.getDate() + i);
              const y   = d.getFullYear();
              const m   = String(d.getMonth() + 1).padStart(2, "0");
              const day = String(d.getDate()).padStart(2, "0");
              const dateKey = `${y}-${m}-${day}`;
              return { key: `${idx}-${i}-${dateKey}`, dateKey, label: WEEKDAY_LABELS[i], date: d.getDate() };
            });
            return (
              <View key={`week-${idx}`} style={styles.weekRow}>
                {days.map((d) => {
                  const selected  = selectedDay === d.dateKey;
                  const hasLog    = dailyLogs.some((l) => l.date?.slice(0, 10) === d.dateKey);
                  return (
                    <TouchableOpacity key={d.key} onPress={() => setSelectedDay(d.dateKey)} style={styles.dayCol}>
                      <Text style={styles.dayLabel}>{d.label.slice(0, 1)}</Text>
                      <View style={[
                        styles.dayBox,
                        selected && styles.dayBoxSelected,
                        !selected && hasLog && styles.dayBoxHasLog,
                      ]}>
                        <Text style={[styles.dayNum, selected && styles.dayNumSelected]}>{d.date}</Text>
                        {hasLog && !selected && <View style={styles.logDot} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Steps card */}
        <View style={styles.card}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.stepsValue}>{displayStats.steps.toLocaleString()}</Text>
              <Text style={styles.stepsLabel}>
                {selectedDay ? `Selected · ${selectedDay}` : "STEPS WALKED"}
              </Text>
            </View>
            <TouchableOpacity style={styles.goalPill} onPress={() => setGoalModal(true)}>
              <Text style={styles.goalEmoji}>🎯</Text>
              <Text style={styles.goalNum}>{Number(goal).toLocaleString()}</Text>
              <Text style={styles.goalSub}>goal</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressWidth}%` as any }]} />
            </View>
            <Text style={styles.progressLbl}>
              {totalSteps.toLocaleString()} / {Number(goal).toLocaleString()} · {progressWidth}% today
            </Text>
          </View>

          <View style={styles.statsRow}>
            {[
              { emoji: "⏱️", value: `${Math.round(displayStats.time)}m`,        label: "Time"     },
              { emoji: "📍", value: `${displayStats.distance.toFixed(1)}km`,     label: "Distance" },
              { emoji: "🔥", value: `${Math.round(displayStats.calories)} kcal`, label: "Calories" },
            ].map((item) => (
              <View key={item.label} style={styles.statBox}>
                <Text style={styles.statEmoji}>{item.emoji}</Text>
                <Text style={styles.statValue}>{item.value}</Text>
                <Text style={styles.statLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Chart card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Activity Chart</Text>
          <View style={styles.toggleRow}>
            {(["DAILY", "WEEKLY", "MONTHLY"] as const).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => { setMode(m); setSelectedDay(null); }}
                style={[styles.togglePill, mode === m && styles.toggleActive]}
              >
                <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.chartRow}>
            {chartData.values.map((v, i) => (
              <View key={`${chartData.labels[i]}-${i}`} style={styles.chartCol}>
                <Text style={styles.chartVal}>
                  {v > 0 ? (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)) : ""}
                </Text>
                <View style={[styles.bar, { height: 10 + (v / maxBar) * 80 }]} />
                <Text style={styles.chartLabel}>{chartData.labels[i]}</Text>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* Goal modal */}
      <Modal visible={goalModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🎯 Daily Step Goal</Text>
            <Text style={styles.modalSub}>How many steps do you want to hit each day?</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              value={goal}
              onChangeText={setGoal}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setGoalModal(false)} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={async () => {
                  try { await saveStepsGoal({ targetSteps: Number(goal || 0) }); }
                  catch (err) { console.error("saveStepsGoal failed:", err); }
                  finally { setGoalModal(false); }
                }}
              >
                <Text style={styles.modalSaveTxt}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const C = {
  bg: "#FFF8F5", white: "#FFFFFF", rose: "#E8929A",roseDark:"#C45C6A",
  roseLight: "#F9C5C9", blush: "#FADADD",mint: "#D4F0E8",
  mintDark:  "#6BBFA3",textDark: "#3D2030",textMid: "#7A4F5A",
  textLight: "#B08090",border:"#F0D5DA",
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 18, paddingTop: 20 },
  backBtn: { marginTop: 60, marginBottom: 30 },
  backTxt: { fontWeight: "700", color: C.textMid },

  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title: { fontSize: 26, fontWeight: "900", color: C.textDark },
  weekPill: { backgroundColor: C.blush, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.roseLight },
  weekPillTxt: { fontSize: 12, fontWeight: "700", color: C.roseDark },

  weekStrip: { height: 82, marginBottom: 14 },
  weekRow: { width: SCREEN_W - 36, flexDirection: "row", justifyContent: "space-between" },
  dayCol: { alignItems: "center", gap: 5 },
  dayLabel: { fontSize: 9, fontWeight: "800", color: C.textLight, textTransform: "uppercase" },
  dayBox: {width: 36, height: 42, borderRadius: 11, backgroundColor: C.white, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: C.border },
  dayBoxSelected: { backgroundColor: C.roseDark, borderColor: C.roseDark },
  dayBoxHasLog: { borderColor: C.rose, backgroundColor: "#FFF0F3" },
  dayNum: { fontWeight: "800", fontSize: 14, color: C.textDark },
  dayNumSelected: { color: C.white },
  logDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.rose, marginTop: 2 },

  card: { backgroundColor: C.white, borderRadius: 22, padding: 18, marginBottom: 14,
    shadowColor: C.rose, shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 3,
    borderWidth: 1, borderColor: C.border },
  cardTitle: { fontSize: 14, fontWeight: "800", color: C.textDark, marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.5 },

  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  stepsValue: { fontSize: 44, fontWeight: "900", color: C.textDark },
  stepsLabel: { fontSize: 10, fontWeight: "700", color: C.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 },

  goalPill: { backgroundColor: C.blush, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10,
    alignItems: "center", borderWidth: 1.5, borderColor: C.roseLight },
  goalEmoji: { fontSize: 20, marginBottom: 2 },
  goalNum: { fontSize: 17, fontWeight: "900", color: C.roseDark },
  goalSub: { fontSize: 9, fontWeight: "700", color: C.textLight, textTransform: "uppercase" },

  progressWrap:  { marginBottom: 18 },
  progressTrack: { height: 10, backgroundColor: C.blush, borderRadius: 8, overflow: "hidden", marginBottom: 5 },
  progressFill:  { height: 10, backgroundColor: C.roseDark, borderRadius: 8 },
  progressLbl:   { fontSize: 11, color: C.textLight, fontWeight: "600", textAlign: "right" },

  statsRow:  { flexDirection: "row", gap: 10 },
  statBox:   { flex: 1, backgroundColor: C.bg, borderRadius: 14, padding: 12,
    alignItems: "center", borderWidth: 1, borderColor: C.border },
  statEmoji: { fontSize: 18, marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: "900", color: C.textDark },
  statLabel: { fontSize: 9, fontWeight: "700", color: C.textLight, textTransform: "uppercase", letterSpacing: 0.3, marginTop: 2 },

  toggleRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  togglePill:       { flex: 1, paddingVertical: 8, borderRadius: 12, backgroundColor: C.bg,
    alignItems: "center", borderWidth: 1.5, borderColor: C.border },
  toggleActive:     { backgroundColor: C.roseDark, borderColor: C.roseDark },
  toggleText: { fontWeight: "700", fontSize: 11, color: C.textMid },
  toggleTextActive: { color: C.white },

  chartRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  chartCol:  { alignItems: "center", flex: 1 },
  chartVal: { fontSize: 8, fontWeight: "700", color: C.textLight, marginBottom: 3 },
  bar: { width: 22, borderRadius: 8, backgroundColor: C.rose, marginBottom: 5 },
  chartLabel: { fontSize: 9, fontWeight: "800", color: C.textMid },

  modalBackdrop:  { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", alignItems: "center" },
  modalCard:  { width: "88%", backgroundColor: C.white, borderRadius: 22, padding: 24 },
  modalTitle:  { fontSize: 18, fontWeight: "900", color: C.textDark, marginBottom: 4 },
  modalSub:   { fontSize: 13, color: C.textLight, fontWeight: "600", marginBottom: 16 },
  modalInput:     { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 12,
    padding: 14, fontSize: 22, fontWeight: "800", color: C.textDark, marginBottom: 20, textAlign: "center" },
  modalActions:   { flexDirection: "row", gap: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: C.bg,
    alignItems: "center", borderWidth: 1.5, borderColor: C.border },
  modalCancelTxt: { fontWeight: "700", color: C.textMid },
  modalSaveBtn:   { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: C.roseDark, alignItems: "center" },
  modalSaveTxt:   { fontWeight: "800", color: C.white },
});