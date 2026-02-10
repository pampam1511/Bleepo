import React, {useEffect,useState} from "react";
import { StyleSheet, Text, View, TouchableOpacity, Modal, TextInput ,Pressable } from "react-native";
import { useHealth } from "@/lib/health-context";
import { router } from "expo-router";


export default function CalorieScreen() {
    const { getTodayCalories, saveTodayCalories} = useHealth();

    const [modalVisible, setModalVisible] = useState(false);
    const [currentIntake,  setCurrentIntake] = useState("0");
    const [goalIntake, setGoalIntake] = useState("0");

    useEffect(() => {
        const load =async () => {
            const doc = await getTodayCalories();
            if (doc) {
                setGoalIntake(String(doc.targetCalories ?? 0));
                setCurrentIntake(String(doc.dailyCalories ?? 0));
            }
            
        };
        load();
    }, []);

    const handleSave = async () => {
        try{
            await saveTodayCalories({
                targetCalories: Number(goalIntake || 0),
                dailyCalories: Number(currentIntake || 0), 
                goalStatus: "active",
            });
        } finally {
            setModalVisible(false);
        }
        
        
    }; 

    const percent = Number(goalIntake || 1) > 0 ? Math.round((Number(currentIntake) / Number(goalIntake)) * 100) : 0;


    
    return (
        <View style={styles.screen}>
            {/* Today Pill */}
            <TouchableOpacity onPress={() => router.push("/")}>
                <Text style={{ fontWeight: "700"}}>← Back to Home</Text>
            </TouchableOpacity>
            <View style={styles.pill}>
                <Text style={styles.pillText}>Today</Text>
            </View>

      {/* Daily Intake Card */}
      <Pressable style={styles.card} onPress={() => setModalVisible(true)}>
        <Text style={styles.cardTitle}>Calories Daily Intake</Text>
        <View style={styles.intakeRow}>
          <Text style={styles.percentText}>{percent}%</Text>
          <View style={styles.circle}>
            <Text style={styles.circleTop}>{goalIntake}</Text>
            <Text style={styles.circleBottom}>{currentIntake}</Text>
          </View>
        </View>
      </Pressable> {/*bongo cat */}

      <Modal visible={modalVisible} 
      transparent 
      animationType="fade" 
      onRequestClose={() => setModalVisible(false)} 
      >
        <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
                <Text style={styles.modalTitle}> Daily Intake</Text>

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
                    <Pressable onPress={() => setModalVisible(false)}>
                        <Text style={styles.modalCancel}>Cancel</Text>
                    </Pressable>
                    <Pressable onPress={handleSave}
                    >
                        <Text style={styles.modalSave}>Save</Text>
                    </Pressable>
                </View>
            </View>

        </View>

      </Modal>

      {/* Nutrition Bars */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Nutrition</Text>
          <Text style={styles.chevron}>&gt;</Text>
        </View>

        {["Carbs", "Fat", "Protein", "Vitamins"].map((label) => (
          <View key={label} style={styles.barRow}>
            <Text style={styles.barLabel}>{label}</Text>
            <View style={styles.barTrack} />
          </View>
        ))}
      </View>

      {/* Nutrition Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Nutrition info</Text>

        <View style={styles.infoRow}>
          <View style={styles.infoCol}>
            <View style={styles.circleSmall}>
              <Text style={styles.circleSmallText}>54%</Text>
              <Text style={styles.circleSmallText}>Carbs</Text>
              <Text style={styles.circleSmallText}>26% Fats</Text>
              <Text style={styles.circleSmallText}>20% Protein</Text>
            </View>
            <Text style={styles.infoLabel}>Recommended</Text>
          </View>

          <View style={styles.infoCol}>
            <View style={styles.circleSmall}>
              <Text style={styles.circleSmallText}>46%</Text>
              <Text style={styles.circleSmallText}>Carbs</Text>
              <Text style={styles.circleSmallText}>26% Fats</Text>
              <Text style={styles.circleSmallText}>28% Protein</Text>
            </View>
            <Text style={styles.infoLabel}>Actual</Text>
          </View>

          <View style={styles.infoCol}>
            <Text style={styles.infoText}>• Carbs 198 g</Text>
            <Text style={styles.infoText}>• Fat 51.2 g</Text>
            <Text style={styles.infoText}>• Protein 121.8 g</Text>
          </View>
        </View>
      </View>
    </View>
    );

}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#fff", padding: 24 },
    title: { fontSize: 26, fontWeight: "800", marginBottom: 16 },
  
    pill: {
      alignSelf: "center",
      backgroundColor: "#d6d6d6",
      paddingHorizontal: 24,
      paddingVertical: 8,
      borderRadius: 20,
      marginBottom: 16,
    },
    pillText: { fontWeight: "700" },
  
    card: {
      backgroundColor: "#e0e0e0",
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
    },
    cardTitle: { fontWeight: "700", marginBottom: 10 },
  
    intakeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    percentText: { fontSize: 32, fontWeight: "800" },
    circle: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: "#cfcfcf",
      alignItems: "center",
      justifyContent: "center",
    },
    circleTop: { fontSize: 18, fontWeight: "800" },
    circleBottom: { fontSize: 16, fontWeight: "700" },
  
    rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    chevron: { fontSize: 18, fontWeight: "700" },
  
    barRow: { flexDirection: "row", alignItems: "center", marginVertical: 6 },
    barLabel: { width: 70, fontWeight: "600" },
    barTrack: {
      flex: 1,
      height: 8,
      backgroundColor: "#c8c8c8",
      borderRadius: 8,
    },
  
    infoRow: { flexDirection: "row", justifyContent: "space-between" },
    infoCol: { alignItems: "center", flex: 1 },
  
    circleSmall: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: "#cfcfcf",
      alignItems: "center",
      justifyContent: "center",
      padding: 6,
    },
    circleSmallText: { fontSize: 10, fontWeight: "700" },
    infoLabel: { marginTop: 6, fontWeight: "700" },
  
    infoText: { fontSize: 12, fontWeight: "600", marginBottom: 6 },
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.35)",
        justifyContent: "center",
        alignItems: "center",
      },
      modalCard: {
        width: "85%",
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
      },
      modalTitle: { fontWeight: "800", fontSize: 18, marginBottom: 12 },
      modalInput: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 10,
        padding: 10,
        marginBottom: 16,
      },
      modalActions: { flexDirection: "row", justifyContent: "space-between" },
      modalCancel: { fontWeight: "700", color: "#666" },
      modalSave: { fontWeight: "800", color: "#000" },
      modalLabel: { fontWeight: "600", marginBottom: 6 },
      
      

  });