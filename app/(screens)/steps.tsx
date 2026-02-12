import React, { useEffect, useMemo, useState } from "react";
import {View,Text,StyleSheet,TouchableOpacity,Modal,TextInput,ScrollView, Dimensions,} from "react-native";
import { Pedometer } from "expo-sensors";
import { useRouter } from "expo-router";
import { useHealth } from "@/lib/health-context";

const SCREEN_W = Dimensions.get("window").width;

export default function StepsScreen() {
  const router = useRouter();
  const { getStepsDaily, getStepsGoal, saveStepsGoal, saveStepsDaily } = useHealth();

  const WEEKDAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [mode, setMode] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("DAILY");
  const [dailyLogs, setDailyLogs] = useState<any[]>([]);

  const [pastStepCount, setPastStepCount] = useState(0);
  const [currentStepCount, setCurrentStepCount] = useState(0);

  const [goal, setGoal] = useState("10000");
  const [goalModal, setGoalModal] = useState(false);

  const stepsToDistanceKm = (steps: number) => steps * 0.0008;
  const stepsToCalories = (steps: number) => steps * 0.04;
  const stepsToMinutes = (steps: number) => steps / 100;

  function startOfWeek(d: Date) {
    const copy = new Date(d);
    copy.setDate(copy.getDate() - copy.getDay());
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  const today = new Date();
  const weekStarts = Array.from({ length: 12 }).map((_, i) => {
    const d = startOfWeek(today);
    d.setDate(d.getDate() + i * 7);
    return d;
  });

  const [weekIndex, setWeekIndex] = useState(0);

  const weekLabel = weekStarts[weekIndex]
    ? weekStarts[weekIndex].toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : "";

  useEffect(() => {
    let sub: any;

    const subscribe = async () => {
      const result = await Pedometer.isAvailableAsync();
      if (!result) return;

      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      const past = await Pedometer.getStepCountAsync(start, end);
      setPastStepCount(past.steps);

      sub = Pedometer.watchStepCount((result) => {
        setCurrentStepCount(result.steps);
      });
    };

    subscribe();

    return () => {
      sub && sub.remove();
    };
  }, []);

  const totalSteps = pastStepCount + currentStepCount;

  useEffect(() => {
    const interval = setInterval(async () => {
      const now = new Date();
      const steps = totalSteps;

      await saveStepsDaily(now, {
        steps,
        timeMinutes: Math.round(stepsToMinutes(steps)),
        distanceKm: Number(stepsToDistanceKm(steps).toFixed(2)),
        caloriesBurned: Math.round(stepsToCalories(steps)),
      });
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [totalSteps, saveStepsDaily]); 

  useEffect(() => {
    const loadDaily = async () => {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      const end = new Date();
      const logs = await getStepsDaily(start, end);
      setDailyLogs(logs);
    };
    loadDaily();
  }, []);

  useEffect(() => {
    const loadGoal = async () => {
      const doc = await getStepsGoal();
      if (doc?.targetSteps) setGoal(String(doc.targetSteps));
    };
    loadGoal();
  }, []);

  const stats = useMemo(() => {
    if (dailyLogs.length === 0) {
      return { steps: totalSteps, time: 0, distance: 0, calories: 0, bars: [] as number[], dates: [] as string[] };
    }

    const sorted = [...dailyLogs].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const last7 = sorted.slice(-7);
    const last30 = sorted.slice(-30);

    const calc = (arr: any[]) => ({
      steps: arr.reduce((s, x) => s + (x.steps ?? 0), 0),
      time: arr.reduce((s, x) => s + (x.timeMinutes ?? 0), 0),
      distance: arr.reduce((s, x) => s + (x.distanceKm ?? 0), 0),
      calories: arr.reduce((s, x) => s + (x.caloriesBurned ?? 0), 0),
      bars: arr.map((x) => x.steps ?? 0),
      dates: arr.map((x) => (x.date ? x.date.slice(0, 10) : "")),
    });

    if (mode === "DAILY") return calc(last7);
    if (mode === "WEEKLY") return calc(last7);
    return calc(last30);
  }, [dailyLogs, mode, totalSteps]);

  const selectedLog = useMemo(() => {
    if (!selectedDay) return null;
    return dailyLogs.find((x) => x.date?.slice(0, 10) === selectedDay);
  }, [dailyLogs, selectedDay]);

  const displayStats = selectedLog
    ? {
        steps: selectedLog.steps ?? 0,
        time: selectedLog.timeMinutes ?? 0,
        distance: selectedLog.distanceKm ?? 0,
        calories: selectedLog.caloriesBurned ?? 0,
      }
    : {
        steps: stats.steps,
        time: stats.time,
        distance: stats.distance,
        calories: stats.calories,
      };

  const goalNum = Math.max(1, Number(goal || 0));
  const progress = Math.min(1, totalSteps / goalNum);
  const progressWidth = Math.round(progress * 100);

  
  const chartData = useMemo(() => {
    if (!dailyLogs.length) return { labels: [], values: [] };

    const sorted = [...dailyLogs].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    if (mode === "DAILY") {
      const last7 = sorted.slice(-7);
      return {
        labels: last7.map((l) => ["S", "M", "T", "W", "T", "F", "S"][new Date(l.date).getDay()]),
        values: last7.map((l) => l.steps ?? 0),
      };
    }

    if (mode === "WEEKLY") {
      const buckets = [0, 0, 0, 0];
      sorted.slice(-28).forEach((l, i) => {
        const w = Math.floor(i / 7);
        buckets[w] += l.steps ?? 0;
      });
      return {
        labels: ["W1", "W2", "W3", "W4"],
        values: buckets,
      };
    }

    const months = Array(12).fill(0);
    sorted.forEach((l) => {
      const d = new Date(l.date);
      months[d.getMonth()] += l.steps ?? 0;
    });
    return {
      labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      values: months,
    };
  }, [dailyLogs, mode]);

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={() => router.push("/")}>
        <Text style={styles.back}>← Back to Home</Text>
      </TouchableOpacity>

      <Text style={styles.weekTitle}>{weekLabel}</Text>

      <View style={styles.weekStrip}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
            setWeekIndex(index);
          }}
          scrollEventThrottle={16}
        >
          {weekStarts.map((weekStart, idx) => {
            const days = Array.from({ length: 7 }).map((_, i) => {
              const d = new Date(weekStart);
              d.setDate(weekStart.getDate() + i);
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, "0"); 
              const day = String(d.getDate()).padStart(2, "0");
              const dateKey = `${y}-${m}-${day}`;

              return {
                key: `${idx}-${i}-${dateKey}`,
                dateKey,
                label: WEEKDAY_LABELS[i],
                date: d.getDate(),
              };
            });

            return (
              <View key={`week-${idx}`} style={styles.weekRow}>
                {days.map((d) => (
                  <TouchableOpacity
                    key={d.key}
                    onPress={() => setSelectedDay(d.dateKey)}
                    style={styles.dayCol}
                  >
                    <Text style={styles.dayLabel}>{d.label}</Text>
                    <View style={styles.dayBox}>
                      <Text style={styles.dayNum}>{d.date}</Text>
                      {selectedDay === d.dateKey && <Text style={styles.dot}>•</Text>}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.card}>
        <View style={styles.topRow}>
          <Text style={styles.stepsValue}>{displayStats.steps.toLocaleString()}</Text>
          <Text style={styles.stepsSub}></Text>
          <View>
            <Text style={styles.stepsLabel}>STEPS</Text>
            <Text style={styles.stepsLabel}>WALKED</Text>
          </View>
          <TouchableOpacity style={styles.goalPill} onPress={() => setGoalModal(true)}>
            <Text style={styles.goalText}>{goal} STEPS</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressWidth}%` }]} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{Math.round(displayStats.time)}m</Text>
            <Text style={styles.statLabel}>Time</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{displayStats.distance.toFixed(1)}km</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{Math.round(displayStats.calories)}</Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>
          
        </View>
        <View style={styles.toggleRow}>
        {["DAILY", "WEEKLY", "MONTHLY"].map((m) => (
          <TouchableOpacity
            key={m}
            onPress={() => setMode(m as any)}
            style={[styles.togglePill, mode === m && styles.toggleActive]}
          >
            <Text style={styles.toggleText}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.chartRow}>
        {chartData.values.map((v, i) => (
          <View key={`${chartData.labels[i]}-${i}`} style={styles.chartCol}>
            <View style={[styles.bar, { height: 20 + (v / 1000) * 40 }]} />
            <Text style={styles.chartLabel}>{chartData.labels[i]}</Text>
          </View>
        ))}
      </View>
      </View>


      <Modal visible={goalModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set Step Goal</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              value={goal}
              onChangeText={setGoal}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setGoalModal(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  await saveStepsGoal({ targetSteps: Number(goal || 0) });
                  setGoalModal(false);
                }}
              >
                <Text style={styles.modalSave}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff", padding: 24 },
  back: { fontWeight: "700", marginBottom: 10 },

  weekTitle: { fontWeight: "700", textAlign: "center", marginBottom: 10 },
  weekRow: { width: SCREEN_W, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 8 },
  weekStrip: { height: 110 },

  dayCol: { alignItems: "center" },
  dayLabel: { fontWeight: "700", marginBottom: 6 },
  dayBox: { width: 42, height: 52, borderRadius: 12, backgroundColor: "#d9d9d9", alignItems: "center", justifyContent: "center" },
  dayNum: { fontWeight: "800", fontSize: 16 },
  dot: { fontSize: 12 },

  card: { backgroundColor: "#d9d9d9", borderRadius: 18, padding: 18, marginTop: 12 , flex:1},
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stepsValue: { fontSize: 32, fontWeight: "800" },
  stepsLabel: { fontWeight: "800", fontSize: 12 },
  stepsSub: { fontWeight: "600", fontSize: 12, color: "#555" },
  goalPill: { backgroundColor: "#cfcfcf", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  goalText: { fontWeight: "700", fontSize: 10 },

  progressBar: { height: 16, backgroundColor: "#c3c3c3", borderRadius: 10, marginVertical: 14 },
  progressFill: { height: 16, backgroundColor: "#8e8e8e", borderRadius: 10 },

  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  statBox: { backgroundColor: "#cfcfcf", borderRadius: 12, padding: 12, width: "30%" },
  statValue: { fontWeight: "800" },
  statLabel: { fontWeight: "600", fontSize: 11 },

  chartRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 10 },
  chartCol: { alignItems: "center" },
  bar: { width: 28, borderRadius: 10, backgroundColor: "#8e8e8e", marginBottom: 6 },
  chartLabel: { fontWeight: "700", fontSize: 11 },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", alignItems: "center" },
  modalCard: { width: "85%", backgroundColor: "#fff", borderRadius: 16, padding: 20 },
  modalTitle: { fontWeight: "800", fontSize: 18, marginBottom: 12 },
  modalInput: { borderWidth: 1, borderColor: "#ccc", borderRadius: 10, padding: 10, marginBottom: 16 },
  modalActions: { flexDirection: "row", justifyContent: "space-between" },
  modalCancel: { fontWeight: "700", color: "#666" },
  modalSave: { fontWeight: "800", color: "#000" },

  toggleRow: {flexDirection: "row",justifyContent: "space-between",marginTop: 14,marginBottom: 12,},
  togglePill: {backgroundColor: "#cfcfcf",borderRadius: 14,paddingHorizontal: 14,paddingVertical: 6,},
  toggleActive: {borderWidth: 1,borderColor: "#000"},
  toggleText: {fontWeight: "700",fontSize: 11},
  
  
  


  
});
