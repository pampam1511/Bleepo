import { useHealth } from "@/lib/health /health-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Animated,
} from "react-native";
import { TextInput } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";


const SCREEN_W    = Dimensions.get("window").width;
const WEEK_DAYS   = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MOOD_OPTIONS    = ["😢", "😕", "😐", "🙂", "😄"];
const PAIN_LEVELS     = [1, 2, 3, 4, 5];
const BLEEDING_OPTIONS   = ["none", "spotting", "light", "medium", "heavy"] as const;
const ACNE_LEVELS        = ["mild", "moderate", "severe"] as const;
const SYMPTOM_OPTIONS    = ["cramps", "headache", "fatigue", "nausea", "bloating"] as const;

// All trackable PCOS symptoms for the trends panel
const PCOS_SYMPTOMS: { key: string; label: string; emoji: string; color: string }[] = [
  { key: "acne",            label: "Acne",           emoji: "🔴", color: "#E8929A" },
  { key: "hairloss",        label: "Hair Loss",       emoji: "🌀", color: "#B07CC6" },
  { key: "bloating",        label: "Bloating",        emoji: "🫧", color: "#6BBFA3" },
  { key: "fatigue",         label: "Fatigue",         emoji: "😴", color: "#E8A87C" },
  { key: "cramps",          label: "Cramps",          emoji: "⚡", color: "#C45C6A" },
  { key: "moodswings",      label: "Mood Swings",     emoji: "🌊", color: "#8A7CC6" },
  { key: "irregularbleed",  label: "Irregular Bleed", emoji: "🩸", color: "#E85C8A" },
  { key: "headache",        label: "Headaches",       emoji: "💫", color: "#7CA8C6" },
];

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  blush:      "#FADADD",
  roseLight:  "#F9C5C9",
  rose:       "#E8929A",
  roseDark:   "#C45C6A",
  lavender:   "#EDD9F5",
  lavDark:    "#B07CC6",
  peach:      "#FAE5D3",
  peachDark:  "#E8A87C",
  mint:       "#D4F0E8",
  mintDark:   "#6BBFA3",
  cream:      "#FFF8F5",
  white:      "#FFFFFF",
  textDark:   "#3D2030",
  textMid:    "#7A4F5A",
  textLight:  "#B08090",
  border:     "#F0D5DA",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildMonth(year: number, month: number) {
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

function isInRange(day: number, start: Date | null, end: Date | null, year: number, month: number) {
  if (!start || !end) return false;
  const curr = new Date(year, month, day);
  return curr >= start && curr <= end;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function PillRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingVertical: 8, gap: 8 }}>
      {children}
    </ScrollView>
  );
}

function OptionPill({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.optionPill, selected && styles.optionPillSelected]}>
      <Text style={[styles.optionPillText, selected && styles.optionPillTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function DotSlider({ value, max, onChange, color = C.rose }: { value: number; max: number; onChange: (n: number) => void; color?: string }) {
  return (
    <View style={styles.dotSliderRow}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <TouchableOpacity key={n} onPress={() => onChange(n)}
          style={[styles.dotSliderDot, value >= n && { backgroundColor: color, transform: [{ scaleY: 1.3 }] }]} />
      ))}
    </View>
  );
}

function StatCard({ label, value, unit, gradient }: { label: string; value: string; unit?: string; gradient: [string, string] }) {
  return (
    <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statCard}>
      <Text style={styles.statCardLabel}>{label}</Text>
      <Text style={styles.statCardValue}>{value}</Text>
      {unit && <Text style={styles.statCardUnit}>{unit}</Text>}
    </LinearGradient>
  );
}

// ─── PCOS Trends Panel ────────────────────────────────────────────────────────

function PCOSTrendsPanel({ allLogs }: { allLogs: any[] }) {
  // Derive PCOS logs from allLogs
  const pcosLogs = allLogs.filter((l) => String(l.type).toUpperCase() === "PCOS");

  // Last 8 weeks of data for mini sparkline
  const last8Weeks = useMemo(() => {
    const weeks: { label: string; logs: any[] }[] = [];
    for (let i = 7; i >= 0; i--) {
      const end   = new Date(); end.setDate(end.getDate() - i * 7);
      const start = new Date(end); start.setDate(start.getDate() - 6);
      const label = `W${8 - i}`;
      const logs  = pcosLogs.filter((l) => {
        const d = new Date(l.date);
        return d >= start && d <= end;
      });
      weeks.push({ label, logs });
    }
    return weeks;
  }, [pcosLogs]);

  // Symptom frequency over all logs
  const symptomFrequency = useMemo(() => {
    const counts: Record<string, number> = {};
    PCOS_SYMPTOMS.forEach((s) => { counts[s.key] = 0; });
    pcosLogs.forEach((l) => {
      if (l.acne_levels && l.acne_levels !== "none") counts["acne"]++;
      if (l.hairloss)            counts["hairloss"]++;
      if (l.bloating > 3)       counts["bloating"]++;
      if (l.fatigue > 3)        counts["fatigue"]++;
      if (l.painLevel > 3)      counts["cramps"]++;
      if (l.stressLevel > 3)    counts["moodswings"]++;
      if (l.irregularBleeding)  counts["irregularbleed"]++;
      if (l.headache)            counts["headache"]++;
    });
    return counts;
  }, [pcosLogs]);

  // Average scores over last 30 days
  const recent30 = pcosLogs.filter((l) => {
    const d = new Date(l.date);
    return (Date.now() - d.getTime()) / 86400000 <= 30;
  });

  const avg = (key: string) => {
    if (!recent30.length) return 0;
    return Math.round(recent30.reduce((s, l) => s + (Number(l[key]) || 0), 0) / recent30.length * 10) / 10;
  };

  // Mood trend: most common mood in last 30 days
  const moodCounts: Record<string, number> = {};
  recent30.forEach((l) => {
    (l.moods ?? []).forEach((m: string) => { moodCounts[m] = (moodCounts[m] ?? 0) + 1; });
  });
  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "😐";

  // Weekly symptom sparkline (total symptoms flagged per week)
  const sparkValues = last8Weeks.map(({ logs }) => {
    return logs.reduce((s, l) => {
      let count = 0;
      if (l.acne_levels && l.acne_levels !== "none") count++;
      if (l.fatigue > 3)       count++;
      if (l.bloating > 3)      count++;
      if (l.facialhair)        count++;
      if (l.stressLevel > 3)   count++;
      if (l.hairloss)          count++;
      if (l.irregularBleeding) count++;
      if (l.headache)          count++;
      return s + count;
    }, 0);
  });
  const maxSpark = Math.max(...sparkValues, 1);

  const totalLogs = pcosLogs.length;

  if (totalLogs === 0) {
    return (
      <View style={tp.empty}>
        <Text style={tp.emptyEmoji}>🔬</Text>
        <Text style={tp.emptyTitle}>No PCOS data yet</Text>
        <Text style={tp.emptyBody}>
          Tap a day on the calendar and log your PCOS symptoms to start seeing trends here.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tp.scroll}>

      {/* ── Header ── */}
      <LinearGradient colors={["#EDE8FD", "#DDD5FA"]} style={tp.header}>
        <Text style={tp.headerTitle}>🔬 PCOS Trends</Text>
        <Text style={tp.headerSub}>{totalLogs} days tracked</Text>
      </LinearGradient>

      {/* ── Avg Scores Row ── */}
      <Text style={tp.sectionTitle}>Last 30 Days</Text>
      <View style={tp.avgRow}>
        {[
          { label: "Pain",     value: avg("painLevel"),   color: C.roseDark,  emoji: "⚡" },
          { label: "Fatigue",  value: avg("fatigue"),     color: C.peachDark, emoji: "😴" },
          { label: "Bloating", value: avg("bloating"),    color: C.mintDark,  emoji: "🫧" },
          { label: "Stress",   value: avg("stressLevel"), color: C.lavDark,   emoji: "🌊" },
        ].map((item) => (
          <View key={item.label} style={tp.avgCard}>
            <Text style={tp.avgEmoji}>{item.emoji}</Text>
            <Text style={[tp.avgValue, { color: item.color }]}>{item.value || "—"}</Text>
            <Text style={tp.avgLabel}>{item.label}</Text>
            {/* Mini bar */}
            <View style={tp.avgBarTrack}>
              <View style={[tp.avgBarFill, { width: `${((Number(item.value) || 0) / 5) * 100}%` as any, backgroundColor: item.color }]} />
            </View>
          </View>
        ))}
      </View>

      {/* ── Mood summary ── */}
      <View style={tp.moodRow}>
        <LinearGradient colors={["#EDE8FD", "#DDD5FA"]} style={tp.moodCard}>
          <Text style={tp.moodLabel}>Dominant Mood</Text>
          <Text style={tp.moodEmoji}>{topMood}</Text>
          <Text style={tp.moodSub}>last 30 days</Text>
        </LinearGradient>
        <LinearGradient colors={[C.blush, C.roseLight]} style={tp.moodCard}>
          <Text style={tp.moodLabel}>Entries</Text>
          <Text style={[tp.moodEmoji, { fontSize: 26 }]}>{totalLogs}</Text>
          <Text style={tp.moodSub}>total logged</Text>
        </LinearGradient>
      </View>

      {/* ── Symptom frequency bars ── */}
      <Text style={tp.sectionTitle}>Symptom Frequency</Text>
      <View style={tp.sympCard}>
        {PCOS_SYMPTOMS.map((s) => {
          const count = symptomFrequency[s.key] ?? 0;
          const pct   = totalLogs > 0 ? Math.round((count / totalLogs) * 100) : 0;
          return (
            <View key={s.key} style={tp.sympRow}>
              <Text style={tp.sympEmoji}>{s.emoji}</Text>
              <Text style={tp.sympLabel}>{s.label}</Text>
              <View style={tp.sympBarTrack}>
                <View style={[tp.sympBarFill, { width: `${pct}%` as any, backgroundColor: s.color }]} />
              </View>
              <Text style={[tp.sympPct, { color: s.color }]}>{pct}%</Text>
            </View>
          );
        })}
      </View>

      {/* ── Weekly sparkline ── */}
      <Text style={tp.sectionTitle}>Weekly Symptom Load</Text>
      <View style={tp.sparkCard}>
        <View style={tp.sparkBars}>
          {sparkValues.map((v, i) => (
            <View key={i} style={tp.sparkCol}>
              <Text style={tp.sparkVal}>{v > 0 ? v : ""}</Text>
              <View style={[tp.sparkBar, { height: 12 + (v / maxSpark) * 60, backgroundColor: v > 3 ? C.roseDark : C.rose }]} />
              <Text style={tp.sparkLabel}>{last8Weeks[i].label}</Text>
            </View>
          ))}
        </View>
        <Text style={tp.sparkCaption}>Number of symptoms flagged above threshold each week</Text>
      </View>

      {/* ── PCOS insight tip ── */}
      <LinearGradient colors={["#FDE8F0", "#FAD5E2"]} style={tp.tipCard}>
        <Text style={tp.tipTitle}>💡 Insight</Text>
        <Text style={tp.tipBody}>
          {avg("stressLevel") >= 4
            ? "Your stress levels are consistently high. High stress can worsen PCOS symptoms by raising cortisol. Try adding short walks or breathing exercises."
            : avg("fatigue") >= 4
            ? "Fatigue is your most common symptom. Low iron and insulin resistance are common PCOS triggers — consider speaking with your provider."
            : avg("bloating") >= 4
            ? "Frequent bloating may be linked to inflammation. Anti-inflammatory foods like leafy greens and omega-3s may help."
            : "Keep logging consistently to unlock personalised PCOS insights based on your patterns."}
        </Text>
      </LinearGradient>

    </ScrollView>
  );
}

const tp = StyleSheet.create({
  scroll:       { paddingHorizontal: 16, paddingBottom: 40 },
  empty:        { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, paddingTop: 60 },
  emptyEmoji:   { fontSize: 48, marginBottom: 12 },
  emptyTitle:   { fontSize: 18, fontWeight: "800", color: C.textDark, marginBottom: 8 },
  emptyBody:    { fontSize: 14, color: C.textLight, textAlign: "center", lineHeight: 20, fontWeight: "600" },

  header:       { borderRadius: 20, padding: 18, marginBottom: 16, marginTop: 4 },
  headerTitle:  { fontSize: 20, fontWeight: "900", color: C.textDark },
  headerSub:    { fontSize: 12, color: C.textMid, fontWeight: "600", marginTop: 2 },

  sectionTitle: { fontSize: 13, fontWeight: "800", color: C.textMid, textTransform: "uppercase",
    letterSpacing: 0.6, marginBottom: 10, marginTop: 4 },

  // Avg score cards
  avgRow:       { flexDirection: "row", gap: 8, marginBottom: 16 },
  avgCard:      { flex: 1, backgroundColor: C.white, borderRadius: 16, padding: 10, alignItems: "center",
    borderWidth: 1, borderColor: C.border },
  avgEmoji:     { fontSize: 18, marginBottom: 4 },
  avgValue:     { fontSize: 20, fontWeight: "900" },
  avgLabel:     { fontSize: 9, fontWeight: "700", color: C.textLight, textTransform: "uppercase", marginTop: 2, marginBottom: 6 },
  avgBarTrack:  { width: "100%", height: 4, backgroundColor: "#F0E0E5", borderRadius: 2, overflow: "hidden" },
  avgBarFill:   { height: 4, borderRadius: 2 },

  // Mood row
  moodRow:      { flexDirection: "row", gap: 10, marginBottom: 16 },
  moodCard:     { flex: 1, borderRadius: 18, padding: 16, alignItems: "center" },
  moodLabel:    { fontSize: 11, fontWeight: "700", color: C.textMid, textTransform: "uppercase", letterSpacing: 0.5 },
  moodEmoji:    { fontSize: 32, marginVertical: 6 },
  moodSub:      { fontSize: 11, color: C.textLight, fontWeight: "600" },

  // Symptom frequency
  sympCard:     { backgroundColor: C.white, borderRadius: 20, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: C.border },
  sympRow:      { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sympEmoji:    { fontSize: 14, width: 20 },
  sympLabel:    { fontSize: 12, fontWeight: "700", color: C.textMid, width: 88 },
  sympBarTrack: { flex: 1, height: 8, backgroundColor: "#F0E5F0", borderRadius: 4, overflow: "hidden" },
  sympBarFill:  { height: 8, borderRadius: 4 },
  sympPct:      { fontSize: 11, fontWeight: "800", width: 32, textAlign: "right" },

  // Sparkline
  sparkCard:    { backgroundColor: C.white, borderRadius: 20, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: C.border },
  sparkBars:    { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 88, marginBottom: 8 },
  sparkCol:     { flex: 1, alignItems: "center" },
  sparkVal:     { fontSize: 9, fontWeight: "700", color: C.textLight, marginBottom: 3 },
  sparkBar:     { width: "80%", borderRadius: 6, marginBottom: 4 },
  sparkLabel:   { fontSize: 9, fontWeight: "700", color: C.textMid },
  sparkCaption: { fontSize: 11, color: C.textLight, fontWeight: "600", textAlign: "center" },

  // Tip
  tipCard:  { borderRadius: 20, padding: 16, marginBottom: 8 },
  tipTitle: { fontSize: 14, fontWeight: "800", color: C.textDark, marginBottom: 6 },
  tipBody:  { fontSize: 13, color: C.textMid, lineHeight: 20, fontWeight: "600" },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const { fetchMonthLogs, fetchAllLogs, getDetailLog, saveHealthLog, getPeriodStats } = useHealth();

  const [date,         setDate]         = useState(new Date());
  const [selectedDay,  setSelectedDay]  = useState<number | null>(null);
  const [activeMode,   setActiveMode]   = useState<"PERIOD" | "PCOS" | null>(null);
  const [logs,         setLogs]         = useState<any[]>([]);
  const [allLogs,      setAllLogs]      = useState<any[]>([]);

  // Panel state: 0 = cycle stats, 1 = PCOS trends
  const [panelIndex,   setPanelIndex]   = useState(0);
  const panelScrollRef = useRef<ScrollView>(null);

  const [moods,              setMoods]              = useState<string[]>([]);
  const [painLevel,          setPainLevel]          = useState(3);
  const [bleeding,           setBleeding]           = useState<"none" | "spotting" | "light" | "medium" | "heavy">("none");
  const [padChanges,         setPadChanges]         = useState(0);
  const [notes,              setNotes]              = useState("");
  const [photos,             setPhotos]             = useState<string[]>([]);
  const [bloating,           setBloating]           = useState(3);
  const [facialHair,         setFacialHair]         = useState<"YES" | "NO">("NO");
  const [stressLevel,        setStressLevel]        = useState(3);
  const [periodStart,        setPeriodStart]        = useState<Date | null>(null);
  const [periodEnd,          setPeriodEnd]          = useState<Date | null>(null);
  const [showStartPicker,    setShowStartPicker]    = useState(false);
  const [showEndPicker,      setShowEndPicker]      = useState(false);
  const [acne_levels,        setAcneLevel]          = useState<"none" | "mild" | "moderate" | "severe">("mild");
  const [fatigue,            setFatigue]            = useState(3);
  const [increasedAppetite,  setIncreasedAppetite]  = useState(3);
  const [periodSymptoms,     setPeriodSymptoms]     = useState<string[]>([]);
  const [hairloss,           setHairloss]           = useState(false);
  const [irregularBleeding,  setIrregularBleeding]  = useState(false);
  const [headache,           setHeadache]           = useState(false);

  const monthLabel = date.toLocaleString("en-US", { month: "long", year: "numeric" });
  const cells      = useMemo(() => buildMonth(date.getFullYear(), date.getMonth()), [date]);

  const selectedDateLocal = selectedDay !== null
    ? new Date(date.getFullYear(), date.getMonth(), selectedDay).toISOString()
    : null;

  useEffect(() => {
    const load = async () => {
      const [monthLogs, all] = await Promise.all([fetchMonthLogs(date), fetchAllLogs()]);
      setLogs(monthLogs);
      setAllLogs(all);
    };
    load();
    setSelectedDay(null);
    setActiveMode(null);
  }, [date]);

  const selectedLog = selectedDay !== null
    ? logs.find((log) => {
        const d = new Date(log.date);
        return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === selectedDay;
      })
    : null;

  useEffect(() => {
    if (!selectedLog || !activeMode) return;
    const loadDetails = async () => {
      const detail = await getDetailLog(selectedLog.$id, activeMode);
      if (!detail) return;
      setPainLevel(detail.painLevel ?? 3);
      setMoods(detail.moods ?? []);
      if (activeMode === "PERIOD") {
        setBleeding(detail.flowIntensity ?? "none");
        setPadChanges(detail.padChanges ?? 0);
        setNotes(detail.notes ?? "");
        setPhotos(detail.photoIds ?? []);
        setPeriodStart(detail.startDate ? new Date(detail.startDate) : null);
        setPeriodEnd(detail.endDate ? new Date(detail.endDate) : null);
        setPeriodSymptoms(detail.symptoms ?? []);
      }
      if (activeMode === "PCOS") {
        setBloating(detail.bloating ?? 3);
        setFacialHair(detail.facialhair ? "YES" : "NO");
        setStressLevel(detail.stressLevel ?? 3);
        setMoods(detail.moods ?? []);
        setAcneLevel(detail.acne_levels ?? "mild");
        setFatigue(detail.fatigue ?? 3);
        setIncreasedAppetite(detail.increased_appetite ?? 3);
        setHairloss(detail.hairloss ?? false);
        setIrregularBleeding(detail.irregularBleeding ?? false);
        setHeadache(detail.headache ?? false);
      }
    };
    loadDetails();
  }, [selectedLog, activeMode]);

  const handleSave = async () => {
    if (!selectedDateLocal || !activeMode) return;
    let safeStart = periodStart;
    let safeEnd   = periodEnd;
    if (activeMode === "PERIOD") {
      if (!safeStart && selectedDay !== null) safeStart = new Date(date.getFullYear(), date.getMonth(), selectedDay);
      if (!safeEnd && selectedDay) safeEnd = safeStart;
    }
    await saveHealthLog({
      date: selectedDateLocal,
      type: activeMode,
      payload: activeMode === "PERIOD"
        ? { painLevel, flowIntensity: bleeding, symptoms: periodSymptoms, padChanges, notes, photoIds: photos,
            startDate: safeStart ? safeStart.toISOString() : null,
            endDate:   safeEnd   ? safeEnd.toISOString()   : null }
        : { painLevel, moods, bloating, facialhair: facialHair === "YES",
            stressLevel, acne_levels, fatigue, increased_appetite: increasedAppetite,
            hairloss, irregularBleeding, headache },
    });
    const [updated, all] = await Promise.all([fetchMonthLogs(date), fetchAllLogs()]);
    setLogs(updated);
    setAllLogs(all);
    setSelectedDay(null);
    setActiveMode(null);
  };

  const handleCancel = () => { setSelectedDay(null); setActiveMode(null); };

  const { avgLength, avgCycle, nextPeriodDate, ovulationDate, fertileStart, fertileEnd, cycleRange } =
    useMemo(() => getPeriodStats(allLogs), [allLogs]);

  const nextPeriodDays = nextPeriodDate
    ? Math.round((nextPeriodDate.getTime() - Date.now()) / 86400000)
    : null;

  const periodDaySet = new Set(
    logs.filter((l) => String(l.type).toUpperCase() === "PERIOD").map((l) => new Date(l.date).getDate())
  );

  const today    = new Date();
  const isToday  = (d: number) =>
    d === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();

  // Handle panel swipe
  const onPanelScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setPanelIndex(idx);
  };

  return (
    <LinearGradient colors={[C.cream, "#FFF0F3", C.cream]} style={styles.screen}>

      {/* ── Month Navigation ── */}
      <View style={styles.monthRow}>
        <TouchableOpacity onPress={() => setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1))} style={styles.arrowBtn}>
          <Text style={styles.arrowText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthText}>{monthLabel}</Text>
        <TouchableOpacity onPress={() => setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1))} style={styles.arrowBtn}>
          <Text style={styles.arrowText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* ── Calendar Grid ── */}
      <View style={styles.calendarCard}>
        <View style={styles.weekRow}>
          {WEEK_DAYS.map((d) => <Text key={d} style={styles.weekDay}>{d}</Text>)}
        </View>
        <View style={styles.daysGrid}>
          {cells.map((d, i) => {
            const isPeriod   = d ? periodDaySet.has(d) : false;
            const isSelected = d === selectedDay;
            const isTodayDay = d ? isToday(d) : false;
            const inRange    = d ? isInRange(d, periodStart, periodEnd, date.getFullYear(), date.getMonth()) : false;
            return (
              <TouchableOpacity
                key={i} disabled={!d}
                onPress={() => {
                  if (!d) return;
                  setSelectedDay(d); setActiveMode(null);
                  setPeriodStart(null); setPeriodEnd(null);
                }}
                style={[styles.dayBox, isPeriod && styles.dayBoxPeriod, isSelected && styles.dayBoxSelected, inRange && !isSelected && styles.dayBoxRange]}
              >
                <Text style={[styles.dayText, isPeriod && styles.dayTextPeriod, isSelected && styles.dayTextSelected, isTodayDay && !isSelected && styles.dayTextToday]}>
                  {d ?? ""}
                </Text>
                {isTodayDay && !isSelected && <View style={styles.todayDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Panel Indicator + Swipe Hint ── */}
      <View style={styles.panelIndicatorRow}>
        <TouchableOpacity
          onPress={() => panelScrollRef.current?.scrollTo({ x: 0, animated: true })}
          style={[styles.panelDot, panelIndex === 0 && styles.panelDotActive]}
        />
        <TouchableOpacity
          onPress={() => panelScrollRef.current?.scrollTo({ x: SCREEN_W, animated: true })}
          style={[styles.panelDot, panelIndex === 1 && styles.panelDotActive]}
        />
        <Text style={styles.swipeHint}>
          {panelIndex === 0 ? "Swipe right for PCOS trends →" : "← Swipe left for cycle"}
        </Text>
      </View>

      {/* ── Swipeable Panel Area ── */}
      <ScrollView
        ref={panelScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onPanelScroll}
        scrollEventThrottle={16}
        style={styles.panelScroll}
      >
        {/* ── Panel 0: Cycle Stats / Log Form ── */}
        <View style={{ width: SCREEN_W }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.cardContent}>

            {selectedDay === null && (
              <View>
                <Text style={styles.cardTitle}>✦ About Your Cycle</Text>
                <View style={styles.statsRow}>
                  <StatCard label="Next Period" value={nextPeriodDays != null ? String(nextPeriodDays) : "--"} unit="days away" gradient={[C.blush, C.roseLight]} />
                  <StatCard label="Avg Period"  value={avgLength != null ? String(avgLength) : "--"} unit="days" gradient={[C.lavender, "#E8C9F5"]} />
                </View>
                <View style={styles.statsRow}>
                  <StatCard label="Cycle Length" value={avgCycle != null ? String(avgCycle) : "--"} unit="days" gradient={[C.peach, "#FAD5B8"]} />
                  <StatCard label="Ovulation"    value={ovulationDate ? ovulationDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "--"} gradient={[C.mint, "#B8EAD8"]} />
                </View>
                <LinearGradient colors={["#FDE8F0", "#FAD5E2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.wideCard}>
                  <Text style={styles.wideCardLabel}>🌸 Fertile Window</Text>
                  <Text style={styles.wideCardValue}>
                    {fertileStart && fertileEnd
                      ? `${fertileStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${fertileEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                      : "Not enough data yet"}
                  </Text>
                </LinearGradient>
                <LinearGradient colors={["#EDE8FD", "#DDD5FA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.wideCard}>
                  <Text style={styles.wideCardLabel}>📅 Cycle Range</Text>
                  <Text style={styles.wideCardValue}>
                    {cycleRange
                      ? `${cycleRange.early.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${cycleRange.late.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                      : "Not enough data yet"}
                  </Text>
                </LinearGradient>
              </View>
            )}

            {selectedDay !== null && (
              <View style={styles.modeRow}>
                {(["PERIOD", "PCOS"] as const).map((mode) => (
                  <TouchableOpacity key={mode} onPress={() => setActiveMode(mode)}
                    style={[styles.modePill, activeMode === mode && styles.modePillActive]}>
                    <Text style={[styles.modePillText, activeMode === mode && styles.modePillTextActive]}>
                      {mode === "PERIOD" ? "🌸 Period" : "🔬 PCOS"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Period form */}
            {selectedDay !== null && activeMode === "PERIOD" && (
              <View style={styles.formCard}>
                <LinearGradient colors={["#FFE8ED", "#FDD5DC"]} style={styles.formHeader}>
                  <Text style={styles.formTitle}>🌸 Period Log</Text>
                  <Text style={styles.formSubtitle}>
                    {new Date(date.getFullYear(), date.getMonth(), selectedDay).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </Text>
                </LinearGradient>
                <View style={styles.formBody}>
                  <SectionLabel>Period Dates</SectionLabel>
                  <View style={styles.dateRow}>
                    <TouchableOpacity onPress={() => setShowStartPicker(true)} style={styles.dateBtn}>
                      <Text style={styles.dateBtnLabel}>Start</Text>
                      <Text style={styles.dateBtnValue}>{periodStart ? periodStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Tap to set"}</Text>
                    </TouchableOpacity>
                    <Text style={styles.dateSeparator}>→</Text>
                    <TouchableOpacity onPress={() => setShowEndPicker(true)} style={styles.dateBtn}>
                      <Text style={styles.dateBtnLabel}>End</Text>
                      <Text style={styles.dateBtnValue}>{periodEnd ? periodEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Tap to set"}</Text>
                    </TouchableOpacity>
                  </View>
                  {showStartPicker && <DateTimePicker value={periodStart ?? new Date()} mode="date" onChange={(_, d) => { setShowStartPicker(false); if (d) setPeriodStart(d); }} />}
                  {showEndPicker   && <DateTimePicker value={periodEnd   ?? new Date()} mode="date" onChange={(_, d) => { setShowEndPicker(false);   if (d) setPeriodEnd(d);   }} />}

                  <SectionLabel>Flow Intensity</SectionLabel>
                  <PillRow>{BLEEDING_OPTIONS.map((b) => <OptionPill key={b} label={b} selected={bleeding === b} onPress={() => setBleeding(b)} />)}</PillRow>

                  <SectionLabel>Pain Level</SectionLabel>
                  <DotSlider value={painLevel} max={5} onChange={setPainLevel} color={C.roseDark} />

                  <SectionLabel>Symptoms</SectionLabel>
                  <PillRow>{SYMPTOM_OPTIONS.map((s) => (
                    <OptionPill key={s} label={s} selected={periodSymptoms.includes(s)}
                      onPress={() => setPeriodSymptoms((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s])} />
                  ))}</PillRow>

                  <SectionLabel>Mood</SectionLabel>
                  <View style={styles.moodRow}>
                    {MOOD_OPTIONS.map((m) => (
                      <TouchableOpacity key={m} style={[styles.moodBtn, moods.includes(m) && styles.moodBtnSelected]}
                        onPress={() => setMoods((p) => p.includes(m) ? p.filter((x) => x !== m) : [...p, m])}>
                        <Text style={styles.moodEmoji}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <SectionLabel>Pad / Tampon Changes</SectionLabel>
                  <DotSlider value={padChanges} max={6} onChange={setPadChanges} color={C.peachDark} />

                  <SectionLabel>Notes</SectionLabel>
                  <TextInput style={styles.notesInput} value={notes} onChangeText={setNotes}
                    placeholder="How are you feeling today?" placeholderTextColor={C.textLight}
                    multiline mode="outlined" outlineColor={C.border} activeOutlineColor={C.rose} />

                  <View style={styles.actionRow}>
                    <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
                    <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                      <LinearGradient colors={[C.rose, C.roseDark]} style={styles.saveBtnGradient}><Text style={styles.saveBtnText}>Save</Text></LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* PCOS log form */}
            {selectedDay !== null && activeMode === "PCOS" && (
              <View style={styles.formCard}>
                <LinearGradient colors={["#EDE8FD", "#DDD5FA"]} style={styles.formHeader}>
                  <Text style={styles.formTitle}>🔬 PCOS Log</Text>
                  <Text style={styles.formSubtitle}>
                    {new Date(date.getFullYear(), date.getMonth(), selectedDay).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </Text>
                </LinearGradient>
                <View style={styles.formBody}>
                  <SectionLabel>Pain Level</SectionLabel>
                  <DotSlider value={painLevel} max={5} onChange={setPainLevel} color={C.lavDark} />

                  <SectionLabel>Mood</SectionLabel>
                  <View style={styles.moodRow}>
                    {MOOD_OPTIONS.map((m) => (
                      <TouchableOpacity key={m} style={[styles.moodBtn, moods.includes(m) && styles.moodBtnSelectedPurple]}
                        onPress={() => setMoods((p) => p.includes(m) ? p.filter((x) => x !== m) : [...p, m])}>
                        <Text style={styles.moodEmoji}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <SectionLabel>Acne Level</SectionLabel>
                  <PillRow>{ACNE_LEVELS.map((lvl) => <OptionPill key={lvl} label={lvl} selected={acne_levels === lvl} onPress={() => setAcneLevel(lvl)} />)}</PillRow>

                  <SectionLabel>Fatigue</SectionLabel>
                  <DotSlider value={fatigue} max={5} onChange={setFatigue} color={C.lavDark} />

                  <SectionLabel>Increased Appetite</SectionLabel>
                  <DotSlider value={increasedAppetite} max={5} onChange={setIncreasedAppetite} color={C.peachDark} />

                  <SectionLabel>Bloating</SectionLabel>
                  <DotSlider value={bloating} max={5} onChange={setBloating} color={C.mintDark} />

                  <SectionLabel>Facial Hair</SectionLabel>
                  <View style={{ flexDirection: "row", gap: 12, marginVertical: 8 }}>
                    {(["YES", "NO"] as const).map((v) => <OptionPill key={v} label={v} selected={facialHair === v} onPress={() => setFacialHair(v)} />)}
                  </View>

                  <SectionLabel>Stress Level</SectionLabel>
                  <DotSlider value={stressLevel} max={5} onChange={setStressLevel} color={C.rose} />

                  <SectionLabel>Hair Loss / Thinning</SectionLabel>
                  <View style={{ flexDirection: "row", gap: 12, marginVertical: 8 }}>
                    {([true, false] as const).map((v) => (
                      <OptionPill key={String(v)} label={v ? "YES" : "NO"} selected={hairloss === v} onPress={() => setHairloss(v)} />
                    ))}
                  </View>

                  <SectionLabel>Irregular Bleeding</SectionLabel>
                  <View style={{ flexDirection: "row", gap: 12, marginVertical: 8 }}>
                    {([true, false] as const).map((v) => (
                      <OptionPill key={String(v)} label={v ? "YES" : "NO"} selected={irregularBleeding === v} onPress={() => setIrregularBleeding(v)} />
                    ))}
                  </View>

                  <SectionLabel>Headache</SectionLabel>
                  <View style={{ flexDirection: "row", gap: 12, marginVertical: 8 }}>
                    {([true, false] as const).map((v) => (
                      <OptionPill key={String(v)} label={v ? "YES" : "NO"} selected={headache === v} onPress={() => setHeadache(v)} />
                    ))}
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
                    <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                      <LinearGradient colors={[C.lavDark, "#8A55A8"]} style={styles.saveBtnGradient}><Text style={styles.saveBtnText}>Save</Text></LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

          </ScrollView>
        </View>

        {/* ── Panel 1: PCOS Trends ── */}
        <View style={{ width: SCREEN_W }}>
          <PCOSTrendsPanel allLogs={allLogs} />
        </View>

      </ScrollView>
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 16 },

  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, marginBottom: 12, marginTop: 60 },
  arrowBtn:  { width: 36, height: 36, borderRadius: 18, backgroundColor: C.white, alignItems: "center", justifyContent: "center",
    shadowColor: C.rose, shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  arrowText: { fontSize: 22, color: C.roseDark, lineHeight: 26 },
  monthText: { fontSize: 18, fontWeight: "700", color: C.textDark, letterSpacing: 0.3 },

  calendarCard: { marginHorizontal: 16, backgroundColor: C.white, borderRadius: 24, padding: 12,
    shadowColor: C.rose, shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 4,
    marginBottom: 6, paddingBottom: 8 },
  weekRow:  { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  weekDay:  { width: "14%", textAlign: "center", fontSize: 11, fontWeight: "700", color: C.textLight, letterSpacing: 0.5 },
  daysGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayBox:            { width: "14%", height: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, marginBottom: 2 },
  dayBoxPeriod:      { backgroundColor: C.blush },
  dayBoxSelected:    { backgroundColor: C.roseDark, shadowColor: C.roseDark, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  dayBoxRange:       { backgroundColor: "#FDEAF0" },
  dayText:           { fontSize: 14, fontWeight: "600", color: C.textDark },
  dayTextPeriod:     { color: C.roseDark },
  dayTextSelected:   { color: C.white, fontWeight: "800" },
  dayTextToday:      { color: C.rose, fontWeight: "800" },
  todayDot:          { width: 4, height: 4, borderRadius: 2, backgroundColor: C.rose, marginTop: 1 },

  // Panel indicator
  panelIndicatorRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginBottom: 6, gap: 6 },
  panelDot:          { width: 6, height: 6, borderRadius: 3, backgroundColor: C.roseLight },
  panelDotActive:    { backgroundColor: C.roseDark, width: 18 },
  swipeHint:         { fontSize: 11, color: C.textLight, fontWeight: "600", marginLeft: 4 },

  panelScroll: { flex: 1 },
  cardContent: { paddingHorizontal: 16, paddingBottom: 40 },

  cardTitle: { fontSize: 17, fontWeight: "800", color: C.textDark, marginBottom: 14, letterSpacing: 0.2 },
  statsRow:  { flexDirection: "row", gap: 12, marginBottom: 12 },
  statCard:  { flex: 1, borderRadius: 20, padding: 16, minHeight: 90, justifyContent: "space-between",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  statCardLabel: { fontSize: 11, fontWeight: "700", color: C.textMid, letterSpacing: 0.8, textTransform: "uppercase" },
  statCardValue: { fontSize: 30, fontWeight: "900", color: C.textDark },
  statCardUnit:  { fontSize: 12, fontWeight: "600", color: C.textLight },
  wideCard:      { borderRadius: 20, padding: 16, marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  wideCardLabel: { fontSize: 13, fontWeight: "700", color: C.textMid, marginBottom: 6 },
  wideCardValue: { fontSize: 16, fontWeight: "800", color: C.textDark },

  modeRow:           { flexDirection: "row", gap: 12, marginBottom: 16 },
  modePill:          { flex: 1, paddingVertical: 12, borderRadius: 16, backgroundColor: C.white, alignItems: "center",
    borderWidth: 1.5, borderColor: C.border, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  modePillActive:    { backgroundColor: C.roseDark, borderColor: C.roseDark },
  modePillText:      { fontSize: 14, fontWeight: "700", color: C.textMid },
  modePillTextActive:{ color: C.white },

  formCard:    { backgroundColor: C.white, borderRadius: 24, overflow: "hidden",
    shadowColor: C.rose, shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  formHeader:  { padding: 20, paddingBottom: 16 },
  formTitle:   { fontSize: 20, fontWeight: "900", color: C.textDark },
  formSubtitle:{ fontSize: 13, color: C.textMid, marginTop: 2 },
  formBody:    { padding: 20 },
  sectionLabel:{ fontSize: 13, fontWeight: "700", color: C.textMid, marginTop: 16, marginBottom: 4,
    letterSpacing: 0.4, textTransform: "uppercase" },

  dateRow:      { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 8 },
  dateBtn:      { flex: 1, backgroundColor: C.blush, borderRadius: 14, padding: 12, alignItems: "center" },
  dateBtnLabel: { fontSize: 11, fontWeight: "700", color: C.textLight, textTransform: "uppercase", letterSpacing: 0.5 },
  dateBtnValue: { fontSize: 15, fontWeight: "800", color: C.roseDark, marginTop: 2 },
  dateSeparator:{ fontSize: 18, color: C.textLight },

  optionPill:         { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#FFF0F3", borderWidth: 1.5, borderColor: C.border },
  optionPillSelected: { backgroundColor: C.roseDark, borderColor: C.roseDark },
  optionPillText:     { fontSize: 13, fontWeight: "600", color: C.textMid },
  optionPillTextSelected: { color: C.white },

  dotSliderRow: { flexDirection: "row", gap: 8, marginVertical: 8, alignItems: "center" },
  dotSliderDot: { flex: 1, height: 8, borderRadius: 4, backgroundColor: "#F0E0E5" },

  moodRow:               { flexDirection: "row", gap: 8, marginVertical: 8 },
  moodBtn:               { width: 48, height: 48, borderRadius: 24, backgroundColor: "#FFF0F3", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: C.border },
  moodBtnSelected:       { backgroundColor: C.roseDark, borderColor: C.roseDark },
  moodBtnSelectedPurple: { backgroundColor: C.lavDark, borderColor: C.lavDark },
  moodEmoji:             { fontSize: 22 },

  notesInput: { backgroundColor: "#FFF8FA", borderRadius: 14, fontSize: 14, minHeight: 80, marginTop: 4 },

  actionRow:      { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelBtn:      { flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: "#F5E8EB", alignItems: "center" },
  cancelBtnText:  { fontSize: 15, fontWeight: "700", color: C.textMid },
  saveBtn:        { flex: 1, borderRadius: 16, overflow: "hidden" },
  saveBtnGradient:{ paddingVertical: 14, alignItems: "center" },
  saveBtnText:    { fontSize: 15, fontWeight: "800", color: C.white, letterSpacing: 0.3 },
});