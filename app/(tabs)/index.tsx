import React, { use, useEffect, useState } from "react";
import { account } from "@/lib/appwrite";
import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useHealth } from "@/lib/health-context";
import { useProfile } from "@/lib/profile-context";

export default function Index() {
  const router = useRouter();
  const { getUserProfile } = useProfile();

  const { getStepsDaily, getStepsGoal, getTodayCalories } = useHealth();

  const [name, setName] = useState("");
  const [todaySteps, setTodaySteps] = useState(0);
  const [stepsGoal, setStepsGoal] = useState(0);

  const [calories, setCalories] = useState({ intake: 0, goal: 0 });
  const [weight, setWeight] = useState(0);
  const [weightGoal, setWeightGoal] = useState(0);

  useEffect(() => {
    const loadToday = async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      const logs = await getStepsDaily(start, end);
      setTodaySteps(logs[0]?.steps ?? 0);

      const goalDoc = await getStepsGoal();
      if (goalDoc?.targetSteps) setStepsGoal(goalDoc.targetSteps);

      const calDoc = await getTodayCalories();
      if (calDoc) {
        setCalories({
          intake: calDoc.dailyCalories ?? 0,
          goal: calDoc.targetCalories ?? 0,
        });
      }
    };

    loadToday();
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await account.get();
        setName(user.name || user.email || "there");
      } catch (err) {
        setName("there");
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      const doc = await getUserProfile();
      if (doc) {
        setWeight(doc.weightKg ?? 0);
        setWeightGoal(doc.weightGoalKg ?? 0);
      }
    };
    loadProfile();
  }, []);

  return (
    <View style={styles.screen}>
      
      <View style={styles.headerRow}>
        <Text style={styles.greeting}>Hi {name}</Text>
        <Text style={styles.menu}>⋮</Text>
      </View>

      {/* Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>SUMMARY</Text>
        <Text style={styles.summaryText}>Cycle:</Text>
        <Text style={styles.summaryText}>PCOS Symptoms:</Text>
        <Text style={styles.summaryText}>Steps:</Text>
        <Text style={styles.summaryText}>Mood:</Text>
        <Text style={styles.summaryText}>Calories:</Text>
        <Text style={styles.summaryText}>Weight: {weight}kg / Goal: {weightGoal}kg</Text>
      </View>

      {/* Calories + Steps */}
      <View style={styles.row}>
        <TouchableOpacity onPress={() => router.push("/(screens)/calories")} style={styles.statCard}>
          <Text style={styles.statTitle}>CALORIES</Text>
          <Text style={styles.statValue}>{calories.intake}</Text>
          <Text style={styles.statValue}>/ {calories.goal}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/(screens)/steps")} style={styles.statCard}>
          <Text style={styles.statTitle}>STEPS</Text>
          <Text style={styles.statValue}>{todaySteps}</Text>
          <Text style={styles.statValue}>/ {stepsGoal}</Text>
        </TouchableOpacity>
      </View>

      {/* Leaderboard */}
      <View style={styles.leaderCard}>
        <TouchableOpacity onPress={() => router.push("/(screens)/leaderboard")}>
          <Text style={styles.leaderTitle}>LEADER BOARD</Text>
          <View style={styles.leaderRow}>
            <View style={styles.leaderBox} />
            <View style={styles.leaderBox} />
            <View style={styles.leaderBox} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff", padding: 24 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  greeting: { fontSize: 28, fontWeight: "800" },
  menu: { fontSize: 24 },

  summaryCard: {
    marginTop: 20,
    backgroundColor: "#d9d9d9",
    borderRadius: 16,
    padding: 16,
  },
  summaryTitle: { fontWeight: "800", marginBottom: 6 },
  summaryText: { fontWeight: "600", marginVertical: 1 },

  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  statCard: {
    width: "48%",
    backgroundColor: "#d9d9d9",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  statTitle: { fontWeight: "800", marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: "800" },

  leaderCard: {
    marginTop: 24,
    backgroundColor: "#d9d9d9",
    borderRadius: 16,
    padding: 16,
  },
  leaderTitle: { fontWeight: "800", marginBottom: 12 },
  leaderRow: { flexDirection: "row", justifyContent: "space-between" },
  leaderBox: {
    width: 70,
    height: 70,
    borderRadius: 16,
    backgroundColor: "#c6c6c6",
  },
});
