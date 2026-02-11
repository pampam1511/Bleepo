import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput } from "react-native";
import { Pedometer } from "expo-sensors";
import { useRouter } from "expo-router";
import { useHealth } from "@/lib/health-context";

export default function StepsScreen() {
  const router = useRouter();
  const { getStepsDaily, getStepsGoal, saveStepsGoal } = useHealth(); // ✅ NEW

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [mode, setMode] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("DAILY");
  const [dailyLogs, setDailyLogs] = useState<any[]>([]);

  

  const [isAvailable, setIsAvailable] = useState("checking...");
  const [pastStepCount, setPastStepCount] = useState(0);
  const [currentStepCount, setCurrentStepCount] = useState(0);

  const [goal, setGoal] = useState("10000"); // ✅ NEW
  const [goalModal, setGoalModal] = useState(false); // ✅ NEW

  const today = new Date();

  const days = Array.from({ length: 5 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (4 - i));
    return {
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase(),
      date: d.getDate(),
    };
  });

  useEffect(() => {
    let sub: any;

    const subscribe = async () => {
      const result = await Pedometer.isAvailableAsync();
      setIsAvailable(String(result));

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
      return { steps: totalSteps, time: 0, distance: 0, calories: 0, bars: [] as number[] };
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
    });

    if (mode === "DAILY") return calc(last7);
    if (mode === "WEEKLY") return calc(last7);
    return calc(last30);
  }, [dailyLogs, mode, totalSteps]);

  
const goalNum = Math.max(1, Number(goal || 0));
const progress = Math.min(1, totalSteps / goalNum);
const progressWidth = Math.round(progress * 100);



  

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={() => router.push("/")}>
        <Text style={styles.back}>← Back to Home</Text>
      </TouchableOpacity>

      <Text style={styles.title}>ACTIVITY</Text>

      <View style={styles.dayRow}>
        {days.map((d) => (
          <TouchableOpacity key={d.key} onPress={() => setSelectedDay(d.key)} style={styles.dayCol}>
            <Text style={styles.dayLabel}>{d.label}</Text>
            <View style={styles.dayBox}>
              <Text style={styles.dayNum}>{d.date}</Text>
              {selectedDay === d.key && <Text style={styles.dot}>•</Text>}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.card}>
        <View style={styles.topRow}>
          <Text style={styles.stepsValue}>{stats.steps.toLocaleString()}</Text>
          <Text style={styles.stepsSub}>{totalSteps} steps</Text>
          <View>
            <Text style={styles.stepsLabel}>STEPS</Text>
            <Text style={styles.stepsLabel}>WALKED</Text>
          </View>

          {/* ✅ Tap to set goal */}
          <TouchableOpacity style={styles.goalPill} onPress={() => setGoalModal(true)}>
            <Text style={styles.goalText}>{goal} STEPS</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill]} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{Math.round(stats.time)}m</Text>
            <Text style={styles.statLabel}>Time</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.distance.toFixed(1)}km</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{Math.round(stats.calories)}</Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>
        </View>
      </View>

      {/* ✅ Goal modal */}
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
  title: { fontSize: 22, fontWeight: "800", textAlign: "center", marginBottom: 16 },

  dayRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  dayCol: { alignItems: "center" },
  dayLabel: { fontWeight: "700", marginBottom: 6 },
  dayBox: { width: 50, height: 60, borderRadius: 12, backgroundColor: "#d9d9d9", alignItems: "center", justifyContent: "center" },
  dayNum: { fontWeight: "800", fontSize: 16 },
  dot: { fontSize: 12 },

  card: { backgroundColor: "#d9d9d9", borderRadius: 18, padding: 18 },
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

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", alignItems: "center" },
  modalCard: { width: "85%", backgroundColor: "#fff", borderRadius: 16, padding: 20 },
  modalTitle: { fontWeight: "800", fontSize: 18, marginBottom: 12 },
  modalInput: { borderWidth: 1, borderColor: "#ccc", borderRadius: 10, padding: 10, marginBottom: 16 },
  modalActions: { flexDirection: "row", justifyContent: "space-between" },
  modalCancel: { fontWeight: "700", color: "#666" },
  modalSave: { fontWeight: "800", color: "#000" },
});
