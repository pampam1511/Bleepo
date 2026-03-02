import { account } from "@/lib/appwrite";
import { useAuth } from "@/lib/auth-context";
import { useCommunity } from "@/lib/community-context";
import { useHealth } from "@/lib/health /health-context";
import { useProfile } from "@/lib/profile-context";
import { Redirect, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Index() {
  const router = useRouter();
  const { user, isLoadingUser } = useAuth();
  const { getUserProfile } = useProfile();
  const {
    getGlobalLeaderboard, getChallenges, getMyChallenges,
    getChallengeLeaderboard, joinChallenge, getInvites,
    acceptInvite, calculateAndApplyPoints, getMyPoints,
  } = useCommunity();
  const { getStepsDaily, getStepsGoal, getTodayCalories } = useHealth();

  // ── ALL state declarations first ─────────────────────────────────────────
  const [role,                setRole]                = useState<string | null>(null);
  const [name,                setName]                = useState("");
  const [todaySteps,          setTodaySteps]          = useState(0);
  const [stepsGoal,           setStepsGoal]           = useState(0);
  const [calories,            setCalories]            = useState({ intake: 0, goal: 0, burned: 0 });
  const [weight,              setWeight]              = useState(0);
  const [weightGoal,          setWeightGoal]          = useState(0);
  const [myPoints,            setMyPoints]            = useState(0);
  const [leaderboard,         setLeaderboard]         = useState<any[]>([]);
  const [challenges,          setChallenges]          = useState<any[]>([]);
  const [myChallenges,        setMyChallenges]        = useState<any[]>([]);
  const [invites,             setInvites]             = useState<any[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [tab,                 setTab]                 = useState<"GLOBAL" | "MINE">("GLOBAL");
  const [challengeBoard,      setChallengeBoard]      = useState<any[]>([]);

  // ── ALL useEffects next ───────────────────────────────────────────────────

  // Load role — only runs when user session is confirmed
  useEffect(() => {
    if (!user) return;
    getUserProfile().then((doc) => {
      setRole(doc?.role ?? "user");
    });
  }, [user]);

  // Load today's health data
  useEffect(() => {
    if (!user) return;
    const loadToday = async () => {
      try {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const end   = new Date(); end.setHours(23, 59, 59, 999);

        const [logs, goalDoc, calDoc] = await Promise.all([
          getStepsDaily(start, end),
          getStepsGoal(),
          getTodayCalories(),
        ]);

        const steps = logs.reduce((s: number, x: any) => s + Number(x.steps ?? 0), 0);
        setTodaySteps(steps);
        if (goalDoc?.targetSteps) setStepsGoal(goalDoc.targetSteps);

        if (calDoc) {
          setCalories({
            intake: Number(calDoc.dailyCaloriesIntake ?? 0),
            goal:   Number(calDoc.targetCalories      ?? 0),
            burned: Number(calDoc.burnedCalories      ?? 0),
          });
        }
      } catch (err) {
        console.error("loadToday failed:", err);
      }
    };
    loadToday();
  }, [user]);

  // Load user profile
  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      try {
        const [user, doc] = await Promise.all([account.get(), getUserProfile()]);
        setName(doc?.displayName || user.name || user.email || "there");
        if (doc) {
          setWeight(doc.weightKg ?? 0);
          setWeightGoal(doc.weightGoalKg ?? 0);
        }
      } catch {
        setName("there");
      }
    };
    loadProfile();
  }, [user]);

  // Load community data
  useEffect(() => {
    if (!user) return;
    const loadCommunity = async () => {
      try {
        const end   = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 7);

        const [board, chal, mine, inv, pts] = await Promise.all([
          getGlobalLeaderboard(start, end),
          getChallenges(),
          getMyChallenges(),
          getInvites(),
          calculateAndApplyPoints(),
        ]);

        setLeaderboard(board);
        setChallenges(chal);
        setMyChallenges(mine);
        setInvites(inv);
        setMyPoints(pts.totalPoints);
        if (mine.length > 0) setSelectedChallengeId(mine[0].$id);
      } catch (err) {
        console.error("loadCommunity failed:", err);
        try {
          const pts = await getMyPoints();
          setMyPoints(pts);
        } catch (_) {}
      }
    };
    loadCommunity();
  }, [user]);

  // Load challenge leaderboard when selection changes
  useEffect(() => {
    if (!selectedChallengeId) return;
    getChallengeLeaderboard(selectedChallengeId)
      .then(setChallengeBoard)
      .catch(console.error);
  }, [selectedChallengeId]);

  // ── Derived values ────────────────────────────────────────────────────────
  const stepsPercent = stepsGoal > 0 ? Math.min(100, Math.round((todaySteps / stepsGoal) * 100)) : 0;
  const calPercent   = calories.goal > 0 ? Math.min(100, Math.round((calories.intake / calories.goal) * 100)) : 0;

  // ── Conditional returns AFTER all hooks ───────────────────────────────────
  // 1. Auth still loading — never call Appwrite until this is false
  if (isLoadingUser) return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFF8F5" }}>
      <ActivityIndicator size="large" color="#E8929A" />
    </View>
  );
  // 2. No session — root layout handles redirect to auth
  if (!user) return null;
  // 3. Role still loading
  if (role === null) return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFF8F5" }}>
      <ActivityIndicator size="large" color="#E8929A" />
    </View>
  );
  // 4. Provider — redirect to their screen
  if (role === "provider") return <Redirect href="/(tabs)/provider-reports" />;

  // ── Normal render ─────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll}>

      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>Hi {name} 👋</Text>
          <Text style={styles.subtitle}>Here's your daily summary</Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>SUMMARY</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Steps</Text>
          <Text style={styles.summaryValue}>{todaySteps.toLocaleString()} / {stepsGoal.toLocaleString()}</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${stepsPercent}%` }]} />
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Calories</Text>
          <Text style={styles.summaryValue}>{calories.intake} / {calories.goal} kcal</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${calPercent}%`, backgroundColor: "#E8929A" }]} />
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Burned</Text>
          <Text style={styles.summaryValue}>{calories.burned} kcal</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Weight</Text>
          <Text style={styles.summaryValue}>
            {weight > 0 ? `${weight}kg` : "—"}
            {weightGoal > 0 ? ` / Goal: ${weightGoal}kg` : ""}
          </Text>
        </View>
      </View>

      <View style={styles.row}>
        <TouchableOpacity onPress={() => router.push("/(screens)/calories")} style={styles.statCard}>
          <Text style={styles.statEmoji}>🍽️</Text>
          <Text style={styles.statTitle}>CALORIES</Text>
          <Text style={styles.statValue}>{calories.intake}</Text>
          <Text style={styles.statSub}>/ {calories.goal} kcal</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/(screens)/steps")} style={styles.statCard}>
          <Text style={styles.statEmoji}>👟</Text>
          <Text style={styles.statTitle}>STEPS</Text>
          <Text style={styles.statValue}>{todaySteps.toLocaleString()}</Text>
          <Text style={styles.statSub}>/ {stepsGoal.toLocaleString()}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.leaderCard}>
        <Text style={styles.sectionTitle}>🏆 LEADERBOARD</Text>
        <TouchableOpacity onPress={() => router.push("/(screens)/leaderboard")}>
          <View style={styles.leaderHeader}>
            <Text style={styles.leaderColHdr}>Rank</Text>
            <Text style={[styles.leaderColHdr, { flex: 1 }]}>User</Text>
            <Text style={styles.leaderColHdr}>Steps</Text>
            <Text style={styles.leaderColHdr}>Points</Text>
          </View>
          {leaderboard.length === 0 && <Text style={styles.muted}>No data yet</Text>}
          {leaderboard.map((u, i) => (
            <View key={u.userId} style={[styles.leaderRow, i === 0 && styles.leaderRowFirst]}>
              <Text style={styles.rank}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
              </Text>
              <Text style={[styles.rowText, { flex: 1 }]}>{u.name}</Text>
              <Text style={styles.rowText}>{u.totalSteps.toLocaleString()}</Text>
              <Text style={[styles.rowText, styles.pointsText]}>{u.totalPoints} pts</Text>
            </View>
          ))}
        </TouchableOpacity>
      </View>

      {invites.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📬 CHALLENGE INVITES</Text>
          {invites.map((inv) => (
            <View key={inv.$id} style={styles.inviteRow}>
              <Text style={styles.rowText}>Challenge invite</Text>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={async () => {
                  await acceptInvite(inv.$id);
                  const [fresh, pts] = await Promise.all([getInvites(), calculateAndApplyPoints()]);
                  setInvites(fresh);
                  setMyPoints(pts.totalPoints);
                }}
              >
                <Text style={styles.acceptTxt}>Accept</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ CHALLENGES</Text>
        <View style={styles.toggleRow}>
          {(["GLOBAL", "MINE"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[styles.togglePill, tab === t && styles.togglePillActive]}
            >
              <Text style={[styles.toggleText, tab === t && styles.toggleTextActive]}>
                {t === "GLOBAL" ? "All Challenges" : "My Challenges"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === "GLOBAL" && (
          <>
            {challenges.length === 0 && <Text style={styles.muted}>No challenges yet</Text>}
            {challenges.map((c) => (
              <View key={c.$id} style={styles.card}>
                <Text style={styles.cardTitle}>{c.title}</Text>
                <Text style={styles.muted}>Goal: {(c.goalStep ?? c.goalSteps ?? 0).toLocaleString()} steps</Text>
                <Text style={styles.muted}>
                  {new Date(c.startDate).toDateString()} → {new Date(c.endDate).toDateString()}
                </Text>
                <TouchableOpacity
                  style={styles.joinBtn}
                  onPress={async () => {
                    try {
                      await joinChallenge(c.$id);
                      const [mine, pts] = await Promise.all([getMyChallenges(), calculateAndApplyPoints()]);
                      setMyChallenges(mine);
                      setMyPoints(pts.totalPoints);
                    } catch (err: any) {
                      console.error("joinChallenge error:", err.message);
                    }
                  }}
                >
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
                style={[styles.card, selectedChallengeId === c.$id && styles.cardActive]}
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

      {selectedChallengeId && (
        <View style={styles.leaderCard}>
          <Text style={styles.sectionTitle}>🏅 CHALLENGE LEADERBOARD</Text>
          <View style={styles.leaderHeader}>
            <Text style={styles.leaderColHdr}>Rank</Text>
            <Text style={[styles.leaderColHdr, { flex: 1 }]}>User</Text>
            <Text style={styles.leaderColHdr}>Steps</Text>
            <Text style={styles.leaderColHdr}>Points</Text>
          </View>
          {challengeBoard.length === 0 && <Text style={styles.muted}>No data yet</Text>}
          {challengeBoard.map((u, i) => (
            <View key={u.userId} style={[styles.leaderRow, i === 0 && styles.leaderRowFirst]}>
              <Text style={styles.rank}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
              </Text>
              <Text style={[styles.rowText, { flex: 1 }]}>{u.name}</Text>
              <Text style={styles.rowText}>{u.totalSteps.toLocaleString()}</Text>
              <Text style={[styles.rowText, styles.pointsText]}>{u.totalPoints} pts</Text>
            </View>
          ))}
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  scroll: { padding: 24, paddingBottom: 48 },

  headerRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  greeting:     { fontSize: 26, fontWeight: "800", color: "#3D2030", marginTop: 60 },
  subtitle:     { fontSize: 13, color: "#B08090", fontWeight: "600", marginTop: 2 },
  pointsPill:   { backgroundColor: "#FADADD", borderRadius: 16, paddingHorizontal: 14,
    paddingVertical: 8, alignItems: "center", borderWidth: 1.5, borderColor: "#F9C5C9" },
  pointsValue:  { fontSize: 20, fontWeight: "900", color: "#C45C6A" },
  pointsLabel:  { fontSize: 10, fontWeight: "700", color: "#E8929A" },

  summaryCard:  { backgroundColor: "#f5f5f5", borderRadius: 18, padding: 18, marginBottom: 16 },
  summaryTitle: { fontWeight: "800", fontSize: 13, color: "#7A4F5A", marginBottom: 12,
    textTransform: "uppercase", letterSpacing: 0.6 },
  summaryRow:   { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  summaryLabel: { fontWeight: "600", color: "#7A4F5A", fontSize: 13 },
  summaryValue: { fontWeight: "700", color: "#3D2030", fontSize: 13 },
  progressBar:  { height: 8, backgroundColor: "#e0e0e0", borderRadius: 6, overflow: "hidden", marginBottom: 12 },
  progressFill: { height: 8, backgroundColor: "#8e8e8e", borderRadius: 6 },

  row:       { flexDirection: "row", justifyContent: "space-between", marginBottom: 16, gap: 12 },
  statCard:  { flex: 1, backgroundColor: "#f5f5f5", borderRadius: 18, padding: 16, alignItems: "center" },
  statEmoji: { fontSize: 22, marginBottom: 4 },
  statTitle: { fontWeight: "800", fontSize: 11, color: "#7A4F5A", letterSpacing: 0.5, marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: "900", color: "#3D2030" },
  statSub:   { fontSize: 11, color: "#B08090", fontWeight: "600" },

  leaderCard:     { backgroundColor: "#f5f5f5", borderRadius: 18, padding: 16, marginBottom: 16 },
  leaderHeader:   { flexDirection: "row", marginBottom: 8, paddingBottom: 6,
    borderBottomWidth: 1, borderBottomColor: "#e0e0e0" },
  leaderColHdr:   { fontWeight: "800", fontSize: 11, color: "#7A4F5A", width: 56, textAlign: "center" },
  leaderRow:      { flexDirection: "row", alignItems: "center", paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  leaderRowFirst: { backgroundColor: "#FFF8F5", borderRadius: 10, paddingHorizontal: 6 },
  rank:           { width: 32, fontWeight: "800", fontSize: 16, color: "#3D2030" },
  rowText:        { fontWeight: "600", color: "#3D2030", width: 56, textAlign: "center" },
  pointsText:     { color: "#C45C6A", fontWeight: "800" },

  section:      { backgroundColor: "#f5f5f5", borderRadius: 18, padding: 16, marginBottom: 16 },
  sectionTitle: { fontWeight: "800", fontSize: 13, color: "#3D2030", marginBottom: 12,
    textTransform: "uppercase", letterSpacing: 0.5 },
  muted:        { color: "#B08090", fontWeight: "600", fontSize: 13 },

  inviteRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#e8e8e8" },
  acceptBtn: { backgroundColor: "#D4F0E8", paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1, borderColor: "#6BBFA3" },
  acceptTxt: { fontWeight: "800", color: "#6BBFA3", fontSize: 13 },

  toggleRow:        { flexDirection: "row", gap: 10, marginBottom: 14 },
  togglePill:       { flex: 1, paddingVertical: 8, borderRadius: 12, backgroundColor: "#ebebeb",
    alignItems: "center", borderWidth: 1.5, borderColor: "#e0e0e0" },
  togglePillActive: { backgroundColor: "#3D2030", borderColor: "#3D2030" },
  toggleText:       { fontWeight: "700", fontSize: 12, color: "#7A4F5A" },
  toggleTextActive: { color: "#fff" },

  card:       { backgroundColor: "#ebebeb", padding: 14, borderRadius: 14, marginBottom: 12 },
  cardActive: { borderWidth: 2, borderColor: "#C45C6A" },
  cardTitle:  { fontWeight: "800", color: "#3D2030", marginBottom: 4 },
  joinBtn:    { marginTop: 10, backgroundColor: "#fff", borderRadius: 10, paddingVertical: 8,
    alignItems: "center", borderWidth: 1.5, borderColor: "#e0e0e0" },
  joinText:   { fontWeight: "800", color: "#3D2030", fontSize: 13 },
});