import React from 'react';
import {useEffect, useState} from 'react';
import {account} from "@/lib/appwrite";
import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import {useHealth} from "@/lib/health-context";





export default function Index() {
  const [name,setName] = useState("");
  const router = useRouter();
  const {getTodayCalories} = useHealth();
  const [calories, setCalories] = useState ({ intake: 0, goal: 0 });


  useEffect(() => {
    const loadUser = async () => {
      try{
        const user = await account.get();
        console.log("USER:", user)
        setName(user.name || user.email ||"there");
      } catch (err) {
        console.log("USER ERROR:", err)
        setName("there");
      }  
    };
    loadUser();
  }, []);


  return (
    <View style={styles.screen} >
      {/* header */}
      <View style={styles.headerRow}>
        <Text style={styles.greeting}>Hi {name }</Text>
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
      </View>
      
      {/* Calories + Steps */}
      <View style={styles.row}>
        <TouchableOpacity onPress={() => router.push("/(screens)/calories")}
         style={styles.statCard}>
          <Text style={styles.statTitle}>CALORIES</Text>
          
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/")} style={styles.statCard}>
          <Text style={styles.statTitle}>STEPS</Text>
         
        </TouchableOpacity>
      </View>

      {/* Leaderboard */}
      <View style={styles.leaderCard}>
        <TouchableOpacity  onPress={() => router.push("/screens /leaderboard")}>
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
  screen: {flex: 1, backgroundColor: "#fff", padding:24},
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

