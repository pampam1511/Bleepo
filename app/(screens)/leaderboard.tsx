import { account } from "@/lib/appwrite";
import { useCommunity } from "@/lib/community-context";
import { useHealth } from "@/lib/health /health-context";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const C = {
  bg:        "#FFF8F5",
  white:     "#FFFFFF",
  rose:      "#E8929A",
  roseDark:  "#C45C6A",
  roseLight: "#F9C5C9",
  blush:     "#FADADD",
  mint:      "#D4F0E8",
  mintDark:  "#6BBFA3",
  peach:     "#FAE5D3",
  peachDark: "#E8A87C",
  lavender:  "#EDD9F5",
  lavDark:   "#B07CC6",
  gold:      "#F5C842",
  silver:    "#C0C0C0",
  bronze:    "#CD7F32",
  textDark:  "#3D2030",
  textMid:   "#7A4F5A",
  textLight: "#B08090",
  border:    "#F0D5DA",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <View style={sc.card}>
      <View style={sc.header}>
        <Text style={sc.emoji}>{emoji}</Text>
        <Text style={sc.title}>{title}</Text>
      </View>
      <View style={sc.body}>{children}</View>
    </View>
  );
}
const sc = StyleSheet.create({
  card:   { backgroundColor: C.white, borderRadius: 20, marginBottom: 16, overflow: "hidden",
    shadowColor: C.rose, shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FDE8ED",
    paddingHorizontal: 16, paddingVertical: 14 },
  emoji:  { fontSize: 18 },
  title:  { fontSize: 15, fontWeight: "800", color: C.textDark },
  body:   { padding: 16 },
});

function LeaderRow({ rank, name, steps, points, isMe }: {
  rank: number; name: string; steps: number; points: number; isMe?: boolean;
}) {
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
  return (
    <View style={[lr.row, isMe && lr.rowMe]}>
      <View style={lr.rankBox}>
        {medal
          ? <Text style={lr.medal}>{medal}</Text>
          : <Text style={lr.rankNum}>{rank}</Text>}
      </View>
      <Text style={[lr.name, isMe && lr.nameMe]} numberOfLines={1}>{name}</Text>
      <View style={lr.statsBox}>
        <Text style={lr.steps}>{steps.toLocaleString()}</Text>
        <Text style={lr.stepsLbl}>steps</Text>
      </View>
      <View style={[lr.pointsPill, isMe && lr.pointsPillMe]}>
        <Text style={[lr.pointsTxt, isMe && lr.pointsTxtMe]}>{points} pts</Text>
      </View>
    </View>
  );
}
const lr = StyleSheet.create({
  row:          { flexDirection: "row", alignItems: "center", paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "#F5EAED", gap: 10 },
  rowMe:        { backgroundColor: "#FFF0F3", borderRadius: 12, paddingHorizontal: 8,
    borderBottomWidth: 0, marginVertical: 2 },
  rankBox:      { width: 32, alignItems: "center" },
  medal:        { fontSize: 20 },
  rankNum:      { fontSize: 14, fontWeight: "800", color: C.textMid },
  name:         { flex: 1, fontSize: 14, fontWeight: "700", color: C.textDark },
  nameMe:       { color: C.roseDark },
  statsBox:     { alignItems: "flex-end", minWidth: 64 },
  steps:        { fontSize: 13, fontWeight: "800", color: C.textDark },
  stepsLbl:     { fontSize: 9, color: C.textLight, fontWeight: "600" },
  pointsPill:   { backgroundColor: "#F5EAED", borderRadius: 10, paddingHorizontal: 10,
    paddingVertical: 4, minWidth: 56, alignItems: "center" },
  pointsPillMe: { backgroundColor: C.roseDark },
  pointsTxt:    { fontSize: 12, fontWeight: "800", color: C.roseDark },
  pointsTxtMe:  { color: C.white },
});

function ChallengeCard({
  challenge,
  joined,
  onJoin,
  onSelect,
  selected,
  loading,
}: {
  challenge: any;
  joined: boolean;
  onJoin: () => void;
  onSelect: () => void;
  selected: boolean;
  loading: boolean;
}) {
  const start = new Date(challenge.startDate);
  const end   = new Date(challenge.endDate);
  const now   = new Date();
  const active = now >= start && now <= end;
  const statusColor = active ? C.mintDark : now > end ? C.textLight : C.peachDark;
  const statusLabel = active ? "Active" : now > end ? "Ended" : "Upcoming";

  return (
    <TouchableOpacity
      onPress={onSelect}
      style={[cc.card, selected && cc.cardSelected]}
      activeOpacity={0.85}
    >
      <View style={cc.topRow}>
        <Text style={cc.title} numberOfLines={1}>{challenge.title}</Text>
        <View style={[cc.statusPill, { backgroundColor: statusColor + "22" }]}>
          <Text style={[cc.statusTxt, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>
      <Text style={cc.meta}>
        🎯 Goal: {(challenge.goalStep ?? challenge.goalSteps ?? 0).toLocaleString()} steps
      </Text>
      <Text style={cc.meta}>
        📅 {start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} →{" "}
        {end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
      </Text>
      <Text style={cc.meta}>
        🔒 {challenge.type === "invite" ? "Invite only" : "Open to all"}
      </Text>
      {!joined ? (
        <TouchableOpacity
          style={[cc.joinBtn, loading && cc.joinBtnDisabled]}
          onPress={onJoin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator size="small" color={C.white} />
            : <Text style={cc.joinTxt}>Join Challenge</Text>}
        </TouchableOpacity>
      ) : (
        <View style={cc.joinedBadge}>
          <Text style={cc.joinedTxt}>✓ Joined — tap to see leaderboard</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
const cc = StyleSheet.create({
  card:           { backgroundColor: "#FFF5F7", borderRadius: 16, padding: 14, marginBottom: 12,
    borderWidth: 1.5, borderColor: C.border },
  cardSelected:   { borderColor: C.roseDark, backgroundColor: "#FFF0F3" },
  topRow:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  title:          { flex: 1, fontSize: 15, fontWeight: "800", color: C.textDark, marginRight: 8 },
  statusPill:     { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  statusTxt:      { fontSize: 11, fontWeight: "800" },
  meta:           { fontSize: 12, color: C.textMid, fontWeight: "600", marginBottom: 4 },
  joinBtn:        { marginTop: 10, backgroundColor: C.roseDark, borderRadius: 12,
    paddingVertical: 10, alignItems: "center" },
  joinBtnDisabled:{ opacity: 0.6 },
  joinTxt:        { color: C.white, fontWeight: "800", fontSize: 14 },
  joinedBadge:    { marginTop: 10, backgroundColor: C.mint, borderRadius: 12,
    paddingVertical: 8, alignItems: "center", borderWidth: 1, borderColor: C.mintDark },
  joinedTxt:      { color: C.mintDark, fontWeight: "800", fontSize: 13 },
});

// ── Modal for creating a challenge ───────────────────────────────────────────
function CreateChallengeModal({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (params: {
    title: string;
    type: "open" | "invite";
    goalSteps: number;
    startDate: string;
    endDate: string;
  }) => Promise<void>;
}) {
  const [title,     setTitle]     = useState("");
  const [goalSteps, setGoalSteps] = useState("50000");
  const [type,      setType]      = useState<"open" | "invite">("open");
  const [startDate, setStartDate] = useState("");
  const [endDate,   setEndDate]   = useState("");
  const [saving,    setSaving]    = useState(false);

  // Default start = today, end = 7 days from now
  useEffect(() => {
    if (visible) {
      const s = new Date(); s.setHours(0, 0, 0, 0);
      const e = new Date(s); e.setDate(e.getDate() + 7);
      setStartDate(s.toISOString().slice(0, 10));
      setEndDate(e.toISOString().slice(0, 10));
    }
  }, [visible]);

  const handleCreate = async () => {
    if (!title.trim() || !goalSteps || !startDate || !endDate) return;
    setSaving(true);
    try {
      await onCreate({
        title: title.trim(),
        type,
        goalSteps: Number(goalSteps),
        startDate: new Date(startDate).toISOString(),
        endDate:   new Date(endDate).toISOString(),
      });
      setTitle(""); setGoalSteps("50000"); setType("open");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={cm.backdrop}>
        <View style={cm.card}>
          <Text style={cm.title}>Create Challenge</Text>

          <Text style={cm.label}>Challenge Name</Text>
          <TextInput style={cm.input} value={title} onChangeText={setTitle}
            placeholder="e.g. 7-Day Step Sprint" placeholderTextColor={C.textLight} />

          <Text style={cm.label}>Step Goal</Text>
          <TextInput style={cm.input} value={goalSteps} onChangeText={setGoalSteps}
            keyboardType="number-pad" />

          <Text style={cm.label}>Type</Text>
          <View style={cm.typeRow}>
            {(["open", "invite"] as const).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setType(t)}
                style={[cm.typePill, type === t && cm.typePillActive]}
              >
                <Text style={[cm.typeTxt, type === t && cm.typeTxtActive]}>
                  {t === "open" ? "🌐 Open" : "🔒 Invite Only"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={cm.label}>Start Date (YYYY-MM-DD)</Text>
          <TextInput style={cm.input} value={startDate} onChangeText={setStartDate}
            placeholder="2026-03-01" placeholderTextColor={C.textLight} />

          <Text style={cm.label}>End Date (YYYY-MM-DD)</Text>
          <TextInput style={cm.input} value={endDate} onChangeText={setEndDate}
            placeholder="2026-03-08" placeholderTextColor={C.textLight} />

          <View style={cm.actions}>
            <Pressable onPress={onClose} style={cm.cancelBtn}>
              <Text style={cm.cancelTxt}>Cancel</Text>
            </Pressable>
            <TouchableOpacity
              onPress={handleCreate}
              style={[cm.createBtn, saving && { opacity: 0.6 }]}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color={C.white} />
                : <Text style={cm.createTxt}>Create</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
const cm = StyleSheet.create({
  backdrop:      { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  card:          { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40 },
  title:         { fontSize: 20, fontWeight: "900", color: C.textDark, marginBottom: 18 },
  label:         { fontSize: 11, fontWeight: "700", color: C.textLight, textTransform: "uppercase",
    letterSpacing: 0.5, marginBottom: 6 },
  input:         { backgroundColor: "#FFF5F7", borderRadius: 12, paddingVertical: 11,
    paddingHorizontal: 14, fontSize: 15, color: C.textDark, borderWidth: 1.5,
    borderColor: C.border, marginBottom: 14 },
  typeRow:       { flexDirection: "row", gap: 10, marginBottom: 14 },
  typePill:      { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: "#FFF5F7",
    alignItems: "center", borderWidth: 1.5, borderColor: C.border },
  typePillActive:{ backgroundColor: C.roseDark, borderColor: C.roseDark },
  typeTxt:       { fontWeight: "700", fontSize: 13, color: C.textMid },
  typeTxtActive: { color: C.white },
  actions:       { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 4 },
  cancelBtn:     { paddingVertical: 12, paddingHorizontal: 18 },
  cancelTxt:     { fontWeight: "700", color: C.textLight, fontSize: 15 },
  createBtn:     { backgroundColor: C.roseDark, borderRadius: 14, paddingVertical: 12,
    paddingHorizontal: 28 },
  createTxt:     { color: C.white, fontWeight: "800", fontSize: 15 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function LeaderboardScreen() {
  const {
    getGlobalLeaderboard,
    getChallenges,
    getMyChallenges,
    getChallengeLeaderboard,
    joinChallenge,
    calculateAndApplyPoints,
    getMyPoints,
    createChallenge,
    getInvites,
    acceptInvite,
  } = useCommunity();

  const { getStepsDaily } = useHealth();

  const [myUserId,     setMyUserId]     = useState("");
  const [myPoints,     setMyPoints]     = useState(0);
  const [globalBoard,  setGlobalBoard]  = useState<any[]>([]);
  const [challenges,   setChallenges]   = useState<any[]>([]);
  const [myChallenges, setMyChallenges] = useState<any[]>([]);
  const [invites,      setInvites]      = useState<any[]>([]);
  const [chalBoard,    setChalBoard]    = useState<any[]>([]);
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [joiningId,    setJoiningId]    = useState<string | null>(null);
  const [tab,          setTab]          = useState<"ALL" | "MINE">("ALL");
  const [createModal,  setCreateModal]  = useState(false);
  const [loading,      setLoading]      = useState(true);

  // ── Load everything on mount ────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const user = await account.get();
        setMyUserId(user.$id);

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

        setGlobalBoard(board);
        setChallenges(chal);
        setMyChallenges(mine);
        setInvites(inv);
        setMyPoints(pts.totalPoints);

        // Auto-select first joined challenge
        if (mine.length > 0) setSelectedId(mine[0].$id);
      } catch (err) {
        console.error("LeaderboardScreen load failed:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Load challenge board when selection changes ─────────────────────────
  useEffect(() => {
    if (!selectedId) return;
    getChallengeLeaderboard(selectedId).then(setChalBoard).catch(console.error);
  }, [selectedId]);

  const joinedIds = new Set(myChallenges.map((c) => c.$id));

  const handleJoin = async (challengeId: string) => {
    setJoiningId(challengeId);
    try {
      await joinChallenge(challengeId);
      const [mine, pts] = await Promise.all([getMyChallenges(), calculateAndApplyPoints()]);
      setMyChallenges(mine);
      setMyPoints(pts.totalPoints);
      setSelectedId(challengeId);
      setTab("MINE");
    } catch (err: any) {
      console.error("join failed:", err.message);
    } finally {
      setJoiningId(null);
    }
  };

  const handleCreate = async (params: Parameters<typeof createChallenge>[0]) => {
    await createChallenge(params);
    const fresh = await getChallenges();
    setChallenges(fresh);
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={C.rose} />
        <Text style={styles.loadingTxt}>Loading leaderboard…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

      {/* Back + header */}
      <TouchableOpacity onPress={() => router.push("/")} style={styles.backBtn}>
        <Text style={styles.backTxt}>← Back to Home</Text>
      </TouchableOpacity>

      <View style={styles.titleRow}>
        <View>
          <Text style={styles.title}>Leaderboard</Text>
          <Text style={styles.subtitle}>Compete, earn points & win</Text>
        </View>
        <View style={styles.myPointsPill}>
          <Text style={styles.myPointsVal}>{myPoints}</Text>
          <Text style={styles.myPointsLbl}>my pts</Text>
        </View>
      </View>

      {/* Points legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <Text style={styles.legendIcon}>🏆</Text>
          <Text style={styles.legendTxt}>Complete challenge = 100 pts</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendIcon}>🔥</Text>
          <Text style={styles.legendTxt}>3+ day streak = 10 pts/day</Text>
        </View>
      </View>

      {/* ── Global leaderboard ── */}
      <SectionCard title="Global Rankings (Last 7 Days)" emoji="🌍">
        {globalBoard.length === 0
          ? <Text style={styles.muted}>No step data yet this week</Text>
          : globalBoard.map((u, i) => (
            <LeaderRow
              key={u.userId}
              rank={i + 1}
              name={u.name}
              steps={u.totalSteps}
              points={u.totalPoints}
              isMe={u.userId === myUserId}
            />
          ))
        }
      </SectionCard>

      {/* ── Invites ── */}
      {invites.length > 0 && (
        <SectionCard title="Challenge Invites" emoji="📬">
          {invites.map((inv) => (
            <View key={inv.$id} style={styles.inviteRow}>
              <Text style={styles.inviteTxt}>You've been invited to a challenge</Text>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={async () => {
                  await acceptInvite(inv.$id);
                  const [freshInv, mine, pts] = await Promise.all([
                    getInvites(),
                    getMyChallenges(),
                    calculateAndApplyPoints(),
                  ]);
                  setInvites(freshInv);
                  setMyChallenges(mine);
                  setMyPoints(pts.totalPoints);
                }}
              >
                <Text style={styles.acceptTxt}>Accept</Text>
              </TouchableOpacity>
            </View>
          ))}
        </SectionCard>
      )}

      {/* ── Challenges ── */}
      <SectionCard title="Challenges" emoji="⚡">
        {/* Tab toggle */}
        <View style={styles.tabRow}>
          {(["ALL", "MINE"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tabPill, tab === t && styles.tabPillActive]}
            >
              <Text style={[styles.tabTxt, tab === t && styles.tabTxtActive]}>
                {t === "ALL" ? `All (${challenges.length})` : `Joined (${myChallenges.length})`}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => setCreateModal(true)}
          >
            <Text style={styles.createTxt}>+ Create</Text>
          </TouchableOpacity>
        </View>

        {tab === "ALL" && (
          <>
            {challenges.length === 0
              ? <Text style={styles.muted}>No challenges yet — create one!</Text>
              : challenges.map((c) => (
                <ChallengeCard
                  key={c.$id}
                  challenge={c}
                  joined={joinedIds.has(c.$id)}
                  selected={selectedId === c.$id}
                  loading={joiningId === c.$id}
                  onJoin={() => handleJoin(c.$id)}
                  onSelect={() => {
                    if (joinedIds.has(c.$id)) {
                      setSelectedId(c.$id);
                      setTab("MINE");
                    }
                  }}
                />
              ))
            }
          </>
        )}

        {tab === "MINE" && (
          <>
            {myChallenges.length === 0
              ? <Text style={styles.muted}>You haven't joined any challenges yet</Text>
              : myChallenges.map((c) => (
                <ChallengeCard
                  key={c.$id}
                  challenge={c}
                  joined
                  selected={selectedId === c.$id}
                  loading={false}
                  onJoin={() => {}}
                  onSelect={() => setSelectedId(c.$id)}
                />
              ))
            }
          </>
        )}
      </SectionCard>

      {/* ── Challenge leaderboard ── */}
      {selectedId && (
        <SectionCard
          title={`${myChallenges.find((c) => c.$id === selectedId)?.title ?? "Challenge"} Rankings`}
          emoji="🏅"
        >
          {chalBoard.length === 0
            ? <Text style={styles.muted}>No activity yet in this challenge</Text>
            : chalBoard.map((u, i) => (
              <LeaderRow
                key={u.userId}
                rank={i + 1}
                name={u.name}
                steps={u.totalSteps}
                points={u.totalPoints}
                isMe={u.userId === myUserId}
              />
            ))
          }
        </SectionCard>
      )}

      {/* Create challenge modal */}
      <CreateChallengeModal
        visible={createModal}
        onClose={() => setCreateModal(false)}
        onCreate={handleCreate}
      />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: C.bg },
  scroll:       { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 48 },
  loadingWrap:  { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg, gap: 12 },
  loadingTxt:   { color: C.textMid, fontWeight: "600" },

  backBtn:  { marginBottom: 10, marginTop:60 },
  backTxt:  { fontWeight: "700", color: C.textMid },

  titleRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  title:         { fontSize: 26, fontWeight: "900", color: C.textDark },
  subtitle:      { fontSize: 13, color: C.textLight, fontWeight: "600", marginTop: 2 },
  myPointsPill:  { backgroundColor: C.blush, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10,
    alignItems: "center", borderWidth: 1.5, borderColor: C.roseLight },
  myPointsVal:   { fontSize: 22, fontWeight: "900", color: C.roseDark },
  myPointsLbl:   { fontSize: 10, fontWeight: "700", color: C.rose },

  legendRow:   { flexDirection: "row", gap: 10, marginBottom: 16 },
  legendItem:  { flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.white, borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: C.border },
  legendIcon:  { fontSize: 16 },
  legendTxt:   { fontSize: 11, fontWeight: "700", color: C.textMid, flex: 1 },

  muted: { color: C.textLight, fontWeight: "600", fontSize: 13, textAlign: "center", paddingVertical: 8 },

  inviteRow:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F5EAED" },
  inviteTxt:  { flex: 1, fontSize: 13, fontWeight: "600", color: C.textMid },
  acceptBtn:  { backgroundColor: C.mint, paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1, borderColor: C.mintDark },
  acceptTxt:  { fontWeight: "800", color: C.mintDark, fontSize: 13 },

  tabRow:         { flexDirection: "row", gap: 8, marginBottom: 16, alignItems: "center" },
  tabPill:        { flex: 1, paddingVertical: 8, borderRadius: 12, backgroundColor: "#FFF5F7",
    alignItems: "center", borderWidth: 1.5, borderColor: C.border },
  tabPillActive:  { backgroundColor: C.textDark, borderColor: C.textDark },
  tabTxt:         { fontSize: 12, fontWeight: "700", color: C.textMid },
  tabTxtActive:   { color: C.white },
  createBtn:      { backgroundColor: C.roseDark, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 8 },
  createTxt:      { color: C.white, fontWeight: "800", fontSize: 12 },
});