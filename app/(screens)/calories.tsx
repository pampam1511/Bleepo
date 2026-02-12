import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Modal, TextInput, Pressable } from "react-native";
import { useHealth } from "@/lib/health-context";
import { router } from "expo-router";

export default function CalorieScreen() {
  const { getTodayCalories, saveTodayCalories, getTodayNutrition, saveTodayNutrition } = useHealth();

  const [currentIntake, setCurrentIntake] = useState("0");
  const [goalIntake, setGoalIntake] = useState("0");
  const [burnedCalories, setBurnedCalories] = useState("0");
  const [burnedGoal, setBurnedGoal] = useState("0");
  const [burnedSource, setBurnedSource] = useState<"steps" | "manual">("manual");

  const [carbs, setCarbs] = useState("0");
  const [fat, setFat] = useState("0");
  const [protein, setProtein] = useState("0");

  const [intakeModal, setIntakeModal] = useState(false);
  const [burnedModal, setBurnedModal] = useState(false);
  const [nutritionModal, setNutritionModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      const doc = await getTodayCalories();
      if (doc) {
        setGoalIntake(String(doc.targetCalories ?? 0));
        setCurrentIntake(String(doc.dailyCaloriesIntake ?? 0)); 
        setBurnedCalories(String(doc.burnedCalories ?? 0));
        setBurnedGoal(String(doc.burnedGoal ?? 0)); 
        setBurnedSource((doc.burnedSource as "steps" | "manual") ?? "manual");
      }

      const n = await getTodayNutrition();
      if (n) {
        setCarbs(String(n.carbs ?? 0));
        setFat(String(n.fat ?? 0));
        setProtein(String(n.protein ?? 0));
      }
    };
    load();
  }, []);

  const intakePercent =
    Number(goalIntake || 1) > 0
      ? Math.round((Number(currentIntake) / Number(goalIntake)) * 100)
      : 0;

  const saveIntake = async () => {
    await saveTodayCalories({
      targetCalories: Number(goalIntake || 0),
      dailyCalories: Number(currentIntake || 0),
      burnedCalories: Number(burnedCalories || 0),
      burnedGoal: Number(burnedGoal || 0),
      burnedSource,
      goalStatus: "active",
    });
    setIntakeModal(false);
  };

  const saveBurned = async () => {
    await saveTodayCalories({
      targetCalories: Number(goalIntake || 0),
      dailyCalories: Number(currentIntake || 0),
      burnedCalories: Number(burnedCalories || 0),
      burnedGoal: Number(burnedGoal || 0),
      burnedSource: "manual",
      goalStatus: "active",
    });
    setBurnedSource("manual");
    setBurnedModal(false);
  };

  const saveNutrition = async () => {
    await saveTodayNutrition({
      carbs: Number(carbs || 0),
      fat: Number(fat || 0),
      protein: Number(protein || 0),
    });
    setNutritionModal(false);
  };

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={() => router.push("/")}>
        <Text style={{ fontWeight: "700" }}>← Back to Home</Text>
      </TouchableOpacity>

      <View style={styles.pill}>
        <Text style={styles.pillText}>Today</Text>
      </View>

      {/* Daily Intake Card */}
      <Pressable style={styles.card} onPress={() => setIntakeModal(true)}>
        <Text style={styles.cardTitle}>Calories Daily Intake</Text>
        <View style={styles.intakeRow}>
          <Text style={styles.percentText}>{intakePercent}%</Text>
          <View style={styles.circle}>
            <Text style={styles.circleBottom}>{currentIntake}</Text>
            <View style={styles.circleLine} />
            <Text style={styles.circleTop}>{goalIntake}</Text>
          </View>
        </View>
      </Pressable>

      {/* Calories Burned Card */}
      <Pressable style={styles.card} onPress={() => setBurnedModal(true)}>
        <Text style={styles.cardTitle}>Calories Burned</Text>
        <View style={styles.burnedRow}>
          <View style={styles.burnedTextCol}>
            <Text style={styles.burnedLabel}>Add Calories burned:</Text>
            <Text style={styles.burnedLabel}>Calories burned Goal:</Text>
          </View>
          <View style={styles.circleSm}>
            <Text style={styles.circleTop}>{burnedCalories}</Text>
            <View style={styles.circleLine} />
            <Text style={styles.circleBottom}>{burnedGoal}</Text>
          </View>
        </View>
      </Pressable>

      {/* Nutrition Card */}
      <Pressable style={styles.card} onPress={() => setNutritionModal(true)}>
        <Text style={styles.cardTitle}>Nutrition</Text>
        {["Carbs", "Fat", "Protein"].map((label) => (
          <View key={label} style={styles.barRow}>
            <Text style={styles.barLabel}>{label}</Text>
            <View style={styles.barTrack} />
          </View>
        ))}
      </Pressable>

      <View style={styles.bottomBar} />

      {/* Intake Modal */}
      <Modal visible={intakeModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Daily Intake</Text>

            <Text style={styles.modalLabel}>Current Intake</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              value={currentIntake}
              onChangeText={setCurrentIntake}
            />

            <Text style={styles.modalLabel}>Goal</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              value={goalIntake}
              onChangeText={setGoalIntake}
            />

            <View style={styles.modalActions}>
              <Pressable onPress={() => setIntakeModal(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </Pressable>
              <Pressable onPress={saveIntake}>
                <Text style={styles.modalSave}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Burned Modal */}
      <Modal visible={burnedModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Calories Burned</Text>
            <Text style={styles.modalLabel}>Burned Today</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              value={burnedCalories}
              onChangeText={setBurnedCalories}
            />
            <Text style={styles.modalLabel}>Burned Goal</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              value={burnedGoal}
              onChangeText={setBurnedGoal}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setBurnedModal(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveBurned}>
                <Text style={styles.modalSave}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Nutrition Modal */}
      <Modal visible={nutritionModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nutrition</Text>
            <Text style={styles.modalLabel}>Carbs</Text>
            <TextInput style={styles.modalInput} keyboardType="number-pad" value={carbs} onChangeText={setCarbs} />
            <Text style={styles.modalLabel}>Fat</Text>
            <TextInput style={styles.modalInput} keyboardType="number-pad" value={fat} onChangeText={setFat} />
            <Text style={styles.modalLabel}>Protein</Text>
            <TextInput style={styles.modalInput} keyboardType="number-pad" value={protein} onChangeText={setProtein} />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setNutritionModal(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveNutrition}>
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
  pill: { alignSelf: "center", backgroundColor: "#d6d6d6", paddingHorizontal: 24, paddingVertical: 8, borderRadius: 20, marginBottom: 16 },
  pillText: { fontWeight: "700" },

  card: { backgroundColor: "#e0e0e0", borderRadius: 16, padding: 16, marginBottom: 16 },
  cardTitle: { fontWeight: "700", marginBottom: 10 },
  intakeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  percentText: { fontSize: 32, fontWeight: "800" },

  circle: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#cfcfcf", alignItems: "center", justifyContent: "center" },
  circleTop: { fontSize: 18, fontWeight: "800" },
  circleBottom: { fontSize: 16, fontWeight: "700" },
  circleLine: { width: 40, height: 2, backgroundColor: "#555", marginVertical: 4 },

  burnedRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  burnedTextCol: { gap: 8 },
  burnedLabel: { fontWeight: "600" },
  circleSm: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#cfcfcf", alignItems: "center", justifyContent: "center" },

  barRow: { flexDirection: "row", alignItems: "center", marginVertical: 6 },
  barLabel: { width: 70, fontWeight: "600" },
  barTrack: { flex: 1, height: 8, backgroundColor: "#c8c8c8", borderRadius: 8 },

  bottomBar: { marginTop: 4, height: 70, borderRadius: 18, backgroundColor: "#d9d9d9" },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", alignItems: "center" },
  modalCard: { width: "85%", backgroundColor: "#fff", borderRadius: 16, padding: 20 },
  modalTitle: { fontWeight: "800", fontSize: 18, marginBottom: 12 },
  modalLabel: { fontWeight: "600", marginBottom: 6 },
  modalInput: { borderWidth: 1, borderColor: "#ccc", borderRadius: 10, padding: 10, marginBottom: 16 },
  modalActions: { flexDirection: "row", justifyContent: "space-between" },
  modalCancel: { fontWeight: "700", color: "#666" },
  modalSave: { fontWeight: "800", color: "#000" },
});
