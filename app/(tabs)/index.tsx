import React, { useEffect, useState } from "react";
import { account } from "@/lib/appwrite";
import { Text, View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useHealth } from "@/lib/health-context";
import { useProfile } from "@/lib/profile-context";
import { useCommunity } from "@/lib/community-context";

export default function Index() {
  const router = useRouter();
  const { getUserProfile } = useProfile();
  const {
    getGlobalLeaderboard,
    getChallenges,
    getMyChallenges,
    getChallengeLeaderboard,
    joinChallenge,
    getInvites,
    acceptInvite,
  } = useCommunity();
  const { getStepsDaily, getStepsGoal, getTodayCalories } = useHealth();

  const [name, setName] = useState("");
  const [todaySteps, setTodaySteps] = useState(0);
  const [stepsGoal, setStepsGoal] = useState(0);
  const [calories, setCalories] = useState({ intake: 0, goal: 0 });
  const [weight, setWeight] = useState(0);
  const [weightGoal, setWeightGoal] = useState(0);

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [myChallenges, setMyChallenges] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [tab, setTab] = useState<"GLOBAL" | "MINE">("GLOBAL");
  const [challengeBoard, setChallengeBoard] = useState<any[]>([]); 

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

  useEffect(() => {
    const load = async () => {
      const user = await account.get();
      const profile = await getUserProfile();
      setName(profile?.displayName || user.name || "there");

      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 7);
      const board = await getGlobalLeaderboard(start, end);
      setLeaderboard(board);

      const chal = await getChallenges();
      setChallenges(chal);

      const mine = await getMyChallenges();
      setMyChallenges(mine);

      const inv = await getInvites();
      setInvites(inv);

      if (mine.length > 0) {
        setSelectedChallengeId(mine[0].$id);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadChallengeBoard = async () => {
      if (!selectedChallengeId) return;
      const board = await getChallengeLeaderboard(selectedChallengeId);
      setChallengeBoard(board); 
    };
    loadChallengeBoard();
  }, [selectedChallengeId]);

  return (
    <ScrollView style={styles.screen}>
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
        <Text style={styles.leaderTitle}>LEADER BOARD</Text>
        {leaderboard.length === 0 && <Text style={styles.muted}>No data yet</Text>}
        {leaderboard.map((u, i) => (
          <View key={u.userId} style={styles.row}>
            <Text style={styles.rank}>{i + 1}</Text>
            <Text style={styles.rowText}>{u.name}</Text>
            <Text style={styles.rowText}>{u.totalSteps} steps</Text>
          </View>
        ))}
      </View>

      {/* Invites */}
      {invites.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CHALLENGE INVITES</Text>
          {invites.map((inv) => (
            <View key={inv.$id} style={styles.row}>
              <Text style={styles.rowText}>Invite to challenge</Text>
              <TouchableOpacity onPress={() => acceptInvite(inv.$id)}>
                <Text style={styles.link}>Accept</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Challenges toggle */}
      <View style={styles.section}>
        <View style={styles.toggleRow}>
          <TouchableOpacity onPress={() => setTab("GLOBAL")}>
            <Text style={[styles.toggleText, tab === "GLOBAL" && styles.toggleActive]}>
              All Challenges
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab("MINE")}>
            <Text style={[styles.toggleText, tab === "MINE" && styles.toggleActive]}>
              My Challenges
            </Text>
          </TouchableOpacity>
        </View>

        {tab === "GLOBAL" && (
          <>
            {challenges.length === 0 && <Text style={styles.muted}>No challenges yet</Text>}
            {challenges.map((c) => (
              <View key={c.$id} style={styles.card}>
                <Text style={styles.cardTitle}>{c.title}</Text>
                <Text style={styles.muted}>Goal: {c.goalSteps} steps</Text>
                <Text style={styles.muted}>
                  {new Date(c.startDate).toDateString()} → {new Date(c.endDate).toDateString()}
                </Text>
                <TouchableOpacity style={styles.joinBtn} onPress={() => joinChallenge(c.$id)}>
                  <Text style={styles.joinText}>Join</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {tab === "MINE" && (
          <>
            {myChallenges.length === 0 && <Text style={styles.muted}>No joined challenges yet</Text>}
            {myChallenges.map((c) => (
              <TouchableOpacity
                key={c.$id}
                style={[
                  styles.card,
                  selectedChallengeId === c.$id && styles.cardActive,
                ]}
                onPress={() => setSelectedChallengeId(c.$id)}
              >
                <Text style={styles.cardTitle}>{c.title}</Text>
                <Text style={styles.muted}>
                  {new Date(c.startDate).toDateString()} → {new Date(c.endDate).toDateString()}
                </Text>
              </TouchableOpacity>
            ))}
          </>
        )}
      </View>

      {/* Challenge leaderboard */}
      {selectedChallengeId && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CHALLENGE LEADERBOARD</Text>
          {challengeBoard.length === 0 && <Text style={styles.muted}>No data yet</Text>}
          {challengeBoard.map((u, i) => (
            <View key={u.userId} style={styles.row}>
              <Text style={styles.rank}>{i + 1}</Text>
              <Text style={styles.rowText}>{u.name}</Text>
              <Text style={styles.rowText}>{u.totalSteps} steps</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
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

  leaderCard: {marginTop: 24,backgroundColor: "#d9d9d9",borderRadius: 16,padding: 16, marginBottom:20},
  leaderTitle: { fontWeight: "800", marginBottom: 12 },
  rank: { fontWeight: "800", width: 20 },
  rowText: { fontWeight: "600" },

  section: { backgroundColor: "#d9d9d9", borderRadius: 16, padding: 14, marginBottom: 28 },
  sectionTitle: { fontWeight: "800", marginBottom: 8 },
  muted: { color: "#666" },
  link: { color: "#000", fontWeight: "700" },

  card: { backgroundColor: "#eee", padding: 12, borderRadius: 12, marginBottom: 16 },
  cardActive: { borderWidth: 1, borderColor: "#000" },
  cardTitle: { fontWeight: "800" },
  joinBtn: { marginTop: 8, backgroundColor: "#c6c6c6", borderRadius: 10, paddingVertical: 8, alignItems: "center" },
  joinText: { fontWeight: "700" },

  toggleRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  toggleText: { fontWeight: "700" },
  toggleActive: { textDecorationLine: "underline" },
});
