import { useHealth } from "@/lib/health /health-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { TextInput } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";

const SCREEN_W       = Dimensions.get("window").width;
const WEEK_DAYS      = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MOOD_OPTIONS   = ["😢", "😕", "😐", "🙂", "😄"];
const BLEEDING_OPTIONS  = ["none", "spotting", "light", "medium", "heavy"] as const;
const ACNE_LEVELS       = ["mild", "moderate", "severe","none"] as const;
const SYMPTOM_OPTIONS   = ["cramps", "headache", "fatigue", "nausea", "bloating"] as const;

const PCOS_SYMPTOMS = [
  { key: "acne",           label: "Acne", color: "#E8929A" },
  { key: "hairloss",       label: "Hair Loss", color: "#B07CC6" },
  { key: "facialhair",     label: "Facial Hair", color: "#C45C6A" },
  { key: "bloating",       label: "Bloating", color: "#6BBFA3" },
  { key: "fatigue",        label: "Fatigue", color: "#E8A87C" },
  { key: "cramps",         label: "Cramps", color: "#C45C6A" },
  { key: "moodswings",     label: "Mood Swings", color: "#8A7CC6" },
  { key: "irregularbleed", label: "Irregular Bleed", color: "#E85C8A" },
  { key: "headache",       label: "Headaches", color: "#7CA8C6" },
];

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  blush:     "#FADADD",
  roseLight: "#F9C5C9",
  rose:      "#E8929A",
  roseDark:  "#C45C6A",
  lavender:  "#EDD9F5",
  lavDark:   "#B07CC6",
  peach:     "#FAE5D3",
  peachDark: "#E8A87C",
  mint:      "#D4F0E8",
  mintDark:  "#6BBFA3",
  cream:     "#FFF8F5",
  white:     "#FFFFFF",
  textDark:  "#3D2030",
  textMid:   "#7A4F5A",
  textLight: "#B08090",
  border:    "#F0D5DA",
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

function isInRange(
  day: number,
  start: Date | null,
  end: Date | null,
  year: number,
  month: number
) {
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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingVertical: 8, gap: 8 }}
    >
      {children}
    </ScrollView>
  );
}

function OptionPill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.optionPill, selected && styles.optionPillSelected]}
    >
      <Text style={[styles.optionPillText, selected && styles.optionPillTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function DotSlider({
  value,
  max,
  onChange,
  color = C.rose,
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
  color?: string;
}) {
  return (
    <View style={styles.dotSliderRow}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <TouchableOpacity
          key={n}
          onPress={() => onChange(n)}
          style={[
            styles.dotSliderDot,
            value >= n && { backgroundColor: color, transform: [{ scaleY: 1.3 }] },
          ]}
        />
      ))}
    </View>
  );
}

function StatCard({
  label,
  value,
  unit,
  gradient,
}: {
  label: string;
  value: string;
  unit?: string;
  gradient: [string, string];
}) {
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.statCard}
    >
      <Text style={styles.statCardLabel}>{label}</Text>
      <Text style={styles.statCardValue}>{value}</Text>
      {unit && <Text style={styles.statCardUnit}>{unit}</Text>}
    </LinearGradient>
  );
}

// PCOS Trends Panel 

function PCOSTrendsPanel({
  allLogs,
  getDetailLog,
}: {
  allLogs: any[];
  getDetailLog: (id: string, type: string) => Promise<any>;
}) {
  // Summary docs that are PCOS type (just have $id, date, type)
  const pcosSummaries = useMemo(
    () => allLogs.filter((l) => String(l?.type ?? "").toUpperCase().trim() === "PCOS"),
    [allLogs]
  );

  // Full detail docs fetched from pcos_logs sub-collection
  const [pcosDetails, setPcosDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pcosSummaries.length === 0) {
      setPcosDetails([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const fetchAll = async () => {
      try {
        const results = await Promise.all(
          pcosSummaries.map((s) => getDetailLog(s.$id, "PCOS"))
        );
        if (!cancelled) {
          // Merge date from summary into detail so we can sort / filter by date
          const merged = results
            .map((detail, i) =>
              detail ? { ...detail, date: pcosSummaries[i].date } : null
            )
            .filter(Boolean);
          setPcosDetails(merged);
        }
      } catch (e) {
        console.error("[PCOSTrends] Failed to fetch detail logs:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [pcosSummaries, getDetailLog]);

  const totalLogs = pcosDetails.length;

  // Last 30 days subset
  const recent30 = useMemo(
    () =>
      pcosDetails.filter(
        (l) => (Date.now() - new Date(l.date).getTime()) / 86400000 <= 30
      ),
    [pcosDetails]
  );

  const avg = (key: string): number | null => {
    if (!recent30.length) return null;
    const sum = recent30.reduce((s, l) => s + (Number(l[key]) || 0), 0);
    return Math.round((sum / recent30.length) * 10) / 10;
  };

  // Symptom frequency
 
  const symptomFrequency = useMemo(() => {
    const counts: Record<string, number> = {};
    PCOS_SYMPTOMS.forEach((s) => { counts[s.key] = 0; });

    const isTruthy = (val: any) =>
      val === true || val === "true" || val === 1 || val === "1";

    pcosDetails.forEach((l) => {
      const acne = String(l.acne_levels ?? "").toLowerCase().trim();
      if (acne && acne !== "none") counts["acne"]++;

      if (isTruthy(l.hairloss))          counts["hairloss"]++;
      if (isTruthy(l.facialhair))        counts["facialhair"]++;
      if (isTruthy(l.irregularBleeding)) counts["irregularbleed"]++;
      if (isTruthy(l.headache))          counts["headache"]++;

      if (Number(l.bloating)    >= 2) counts["bloating"]++;
      if (Number(l.fatigue)     >= 2) counts["fatigue"]++;
      if (Number(l.painLevel)   >= 2) counts["cramps"]++;
      if (Number(l.stressLevel) >= 2) counts["moodswings"]++;
    });

    return counts;
  }, [pcosDetails]);

  // Dominant mood last 30 days
  const { topMood, topMoodLabel } = useMemo(() => {
    const moodCounts: Record<string, number> = {};
    recent30.forEach((l) => {
      (l.moods ?? []).forEach((m: string) => {
        moodCounts[m] = (moodCounts[m] ?? 0) + 1;
      });
    });
    const top = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "😐";
    const label =
      top === "😄" ? "Feeling great" :
      top === "🙂" ? "Mostly good" :
      top === "😐" ? "Neutral" :
      top === "😕" ? "A bit low" : "Struggling";
    return { topMood: top, topMoodLabel: label };
  }, [recent30]);

  // Most frequent symptom
  const topSymptom = useMemo(
    () =>
      PCOS_SYMPTOMS.reduce(
        (best, s) =>
          (symptomFrequency[s.key] ?? 0) > (symptomFrequency[best.key] ?? 0)
            ? s
            : best,
        PCOS_SYMPTOMS[0]
      ),
    [symptomFrequency]
  );

  // Days since last PCOS log
  const daysSinceLast = useMemo(() => {
    if (!pcosDetails.length) return null;
    const latest = Math.max(
      ...pcosDetails.map((l) => new Date(l.date).getTime())
    );
    return Math.round((Date.now() - latest) / 86400000);
  }, [pcosDetails]);

  const facialHairPct =
    totalLogs > 0
      ? Math.round((symptomFrequency["facialhair"] / totalLogs) * 100)
      : 0;
  const irregularPct =
    totalLogs > 0
      ? Math.round((symptomFrequency["irregularbleed"] / totalLogs) * 100)
      : 0;

  //  Loading state
  if (loading) {
    return (
      <View style={tp.empty}>
        <ActivityIndicator size="large" color={C.lavDark} />
        <Text style={[tp.emptyBody, { marginTop: 16 }]}>
          Loading your PCOS data…
        </Text>
      </View>
    );
  }

  const avgPain = avg("painLevel");
  const avgFatigue = avg("fatigue");
  const avgBloat = avg("bloating");
  const avgStress = avg("stressLevel");

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={tp.scroll}
    >
      <Text style={tp.pageTitle}>✦ Your PCOS Insights</Text>

      {/* ── Row 1: Avg Pain + Avg Fatigue ── */}
      <View style={styles.statsRow}>
        <LinearGradient
          colors={[C.blush, C.roseLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statCard}
        >
          <Text style={styles.statCardLabel}>Avg Pain</Text>
          <Text style={styles.statCardValue}>{avgPain ?? "--"}</Text>
          <Text style={styles.statCardUnit}>out of 5</Text>
        </LinearGradient>
        <LinearGradient
          colors={[C.lavender, "#E8C9F5"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statCard}
        >
          <Text style={styles.statCardLabel}>Avg Fatigue</Text>
          <Text style={styles.statCardValue}>{avgFatigue ?? "--"}</Text>
          <Text style={styles.statCardUnit}>out of 5</Text>
        </LinearGradient>
      </View>

      {/* ── Row 2: Avg Bloating + Avg Stress ── */}
      <View style={styles.statsRow}>
        <LinearGradient
          colors={[C.mint, "#B8EAD8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statCard}
        >
          <Text style={styles.statCardLabel}>Avg Bloating</Text>
          <Text style={styles.statCardValue}>{avgBloat ?? "--"}</Text>
          <Text style={styles.statCardUnit}>out of 5</Text>
        </LinearGradient>
        <LinearGradient
          colors={[C.peach, "#FAD5B8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statCard}
        >
          <Text style={styles.statCardLabel}>Avg Stress</Text>
          <Text style={styles.statCardValue}>{avgStress ?? "--"}</Text>
          <Text style={styles.statCardUnit}>out of 5</Text>
        </LinearGradient>
      </View>

      {/* ── Row 3: Days Logged + Days Since Last ── */}
      <View style={styles.statsRow}>
        <LinearGradient
          colors={["#FDE8F0", "#FAD5E2"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statCard}
        >
          <Text style={styles.statCardLabel}>Days Logged</Text>
          <Text style={styles.statCardValue}>{pcosSummaries.length}</Text>
          <Text style={styles.statCardUnit}>total entries</Text>
        </LinearGradient>
        <LinearGradient
          colors={["#EDE8FD", "#DDD5FA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statCard}
        >
          <Text style={styles.statCardLabel}>Last Log</Text>
          <Text style={styles.statCardValue}>{daysSinceLast ?? "--"}</Text>
          <Text style={styles.statCardUnit}>days ago</Text>
        </LinearGradient>
      </View>

      {/* ── Wide card: Dominant Mood ── */}
      <LinearGradient
        colors={["#EDE8FD", "#DDD5FA"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.wideCard}
      >
        <Text style={styles.wideCardLabel}>Dominant Mood (Last 30 Days)</Text>
        <Text style={styles.wideCardValue}>
          {topMood}{"  "}{topMoodLabel}
        </Text>
      </LinearGradient>

      {/* ── Wide card: Top Symptom ── */}
      <LinearGradient
        colors={["#FFE8ED", "#FDD5DC"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.wideCard}
      >
        <Text style={styles.wideCardLabel}>Most Frequent Symptom</Text>
        <Text style={styles.wideCardValue}>
          {"  "}{topSymptom.label}{"  "}
          <Text style={{ fontSize: 14, fontWeight: "600", color: C.textLight }}>
            ({symptomFrequency[topSymptom.key] ?? 0} days)
          </Text>
        </Text>
      </LinearGradient>

      {/* ── Wide card: Facial Hair ── */}
      <LinearGradient
        colors={[C.peach, "#FAD5B8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.wideCard}
      >
        <Text style={styles.wideCardLabel}>Facial Hair Reported</Text>
        <Text style={styles.wideCardValue}>{facialHairPct}% </Text>
      </LinearGradient>

      {/* ── Wide card: Irregular Bleeding ── */}
      <LinearGradient
        colors={[C.blush, C.roseLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.wideCard}
      >
        <Text style={styles.wideCardLabel}>Irregular Bleeding</Text>
        <Text style={styles.wideCardValue}>{irregularPct}% </Text>
      </LinearGradient>

      {/* ── Symptom Frequency Bars ── */}
      <Text style={tp.sectionTitle}>Symptom Frequency</Text>
      <View style={tp.sympCard}>
        {PCOS_SYMPTOMS.map((s) => {
          const count = symptomFrequency[s.key] ?? 0;
          const pct   = totalLogs > 0 ? Math.round((count / totalLogs) * 100) : 0;
          return (
            <View key={s.key} style={tp.sympRow}>
              <Text style={tp.sympLabel}>{s.label}</Text>
              <View style={tp.sympBarTrack}>
                <View
                  style={[
                    tp.sympBarFill,
                    {
                      width: pct > 0 ? (`${pct}%` as any) : 2,
                      backgroundColor: s.color,
                    },
                  ]}
                />
              </View>
              <Text style={[tp.sympPct, { color: pct > 0 ? s.color : C.textLight }]}>
                {pct}%
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const tp = StyleSheet.create({
  scroll:       { paddingHorizontal: 16, paddingBottom: 40 },
  empty:        { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, paddingTop: 60 },
  emptyEmoji:   { fontSize: 48, marginBottom: 12 },
  emptyTitle:   { fontSize: 18, fontWeight: "800", color: C.textDark, marginBottom: 8 },
  emptyBody:    { fontSize: 14, color: C.textLight, textAlign: "center", lineHeight: 20, fontWeight: "600" },
  pageTitle:    { fontSize: 17, fontWeight: "800", color: C.textDark, marginBottom: 14, letterSpacing: 0.2 },
  sectionTitle: {
    fontSize: 13, fontWeight: "800", color: C.textMid, textTransform: "uppercase",
    letterSpacing: 0.6, marginBottom: 10, marginTop: 8,
  },
  sympCard:     {
    backgroundColor: C.white, borderRadius: 20, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: C.border,
  },
  sympRow:      { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sympEmoji:    { fontSize: 14, width: 20 },
  sympLabel:    { fontSize: 12, fontWeight: "700", color: C.textMid, width: 96 },
  sympBarTrack: { flex: 1, height: 8, backgroundColor: "#F0E5F0", borderRadius: 4, overflow: "hidden" },
  sympBarFill:  { height: 8, borderRadius: 4 },
  sympPct:      { fontSize: 11, fontWeight: "800", width: 34, textAlign: "right" },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const { fetchMonthLogs, fetchAllLogs, getDetailLog, saveHealthLog, getPeriodStats } =
    useHealth();

  const [date,        setDate]        = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [activeMode,  setActiveMode]  = useState<"PERIOD" | "PCOS" | null>(null);
  const [logs,        setLogs]        = useState<any[]>([]);
  const [allLogs,     setAllLogs]     = useState<any[]>([]);

  const [panelIndex,    setPanelIndex]    = useState(0);
  const panelScrollRef = useRef<ScrollView>(null);

  const [moods,             setMoods]             = useState<string[]>([]);
  const [painLevel,         setPainLevel]         = useState(3);
  const [bleeding,          setBleeding]          = useState<"none" | "spotting" | "light" | "medium" | "heavy">("none");
  const [padChanges,        setPadChanges]        = useState(0);
  const [notes,             setNotes]             = useState("");
  const [photos,            setPhotos]            = useState<string[]>([]);
  const [bloating,          setBloating]          = useState(3);
  const [facialHair,        setFacialHair]        = useState<"YES" | "NO">("NO");
  const [stressLevel,       setStressLevel]       = useState(3);
  const [periodStart,       setPeriodStart]       = useState<Date | null>(null);
  const [periodEnd,         setPeriodEnd]         = useState<Date | null>(null);
  const [showStartPicker,   setShowStartPicker]   = useState(false);
  const [showEndPicker,     setShowEndPicker]     = useState(false);
  const [acne_levels,       setAcneLevel]         = useState<"none" | "mild" | "moderate" | "severe">("mild");
  const [fatigue,           setFatigue]           = useState(3);
  const [increasedAppetite, setIncreasedAppetite] = useState(3);
  const [periodSymptoms,    setPeriodSymptoms]    = useState<string[]>([]);
  const [hairloss,          setHairloss]          = useState(false);
  const [irregularBleeding, setIrregularBleeding] = useState(false);
  const [headache,          setHeadache]          = useState(false);

  const monthLabel = date.toLocaleString("en-US", { month: "long", year: "numeric" });
  const cells      = useMemo(() => buildMonth(date.getFullYear(), date.getMonth()), [date]);

  const selectedDateLocal =
    selectedDay !== null
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

  const selectedLog =
    selectedDay !== null
      ? logs.find((log) => {
          const d = new Date(log.date);
          return (
            d.getFullYear() === date.getFullYear() &&
            d.getMonth() === date.getMonth() &&
            d.getDate() === selectedDay
          );
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
      if (!safeStart && selectedDay !== null)
        safeStart = new Date(date.getFullYear(), date.getMonth(), selectedDay);
      if (!safeEnd && selectedDay) safeEnd = safeStart;
    }
    await saveHealthLog({
      date: selectedDateLocal,
      type: activeMode,
      payload:
        activeMode === "PERIOD"
          ? {
              painLevel,
              flowIntensity: bleeding,
              symptoms: periodSymptoms,
              padChanges,
              notes,
              photoIds: photos,
              startDate: safeStart ? safeStart.toISOString() : null,
              endDate:   safeEnd   ? safeEnd.toISOString()   : null,
            }
          : {
              painLevel,
              moods,
              bloating,
              facialhair: facialHair === "YES",
              stressLevel,
              acne_levels,
              fatigue,
              increased_appetite: increasedAppetite,
              hairloss,
              irregularBleeding,
              headache,
            },
    });
    const [updated, all] = await Promise.all([fetchMonthLogs(date), fetchAllLogs()]);
    setLogs(updated);
    setAllLogs(all);
    setSelectedDay(null);
    setActiveMode(null);
  };

  const handleCancel = () => {
    setSelectedDay(null);
    setActiveMode(null);
  };

  const { avgLength, avgCycle, nextPeriodDate, ovulationDate, fertileStart, fertileEnd, cycleRange } =
    useMemo(() => getPeriodStats(allLogs), [allLogs]);

  const nextPeriodDays = nextPeriodDate
    ? Math.round((nextPeriodDate.getTime() - Date.now()) / 86400000)
    : null;

  const periodDaySet = new Set(
    logs
      .filter((l) => String(l?.type ?? "").toUpperCase() === "PERIOD")
      .map((l) => new Date(l.date).getDate())
  );

  const today   = new Date();
  const isToday = (d: number) =>
    d === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const onPanelScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setPanelIndex(idx);
  };

  return (
    <LinearGradient colors={[C.cream, "#FFF0F3", C.cream]} style={styles.screen}>

      {/* ── Month Navigation ── */}
      <View style={styles.monthRow}>
        <TouchableOpacity
          onPress={() => setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1))}
          style={styles.arrowBtn}
        >
          <Text style={styles.arrowText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthText}>{monthLabel}</Text>
        <TouchableOpacity
          onPress={() => setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1))}
          style={styles.arrowBtn}
        >
          <Text style={styles.arrowText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* ── Calendar Grid ── */}
      <View style={styles.calendarCard}>
        <View style={styles.weekRow}>
          {WEEK_DAYS.map((d) => (
            <Text key={d} style={styles.weekDay}>{d}</Text>
          ))}
        </View>
        <View style={styles.daysGrid}>
          {cells.map((d, i) => {
            const isPeriod   = d ? periodDaySet.has(d) : false;
            const isSelected = d === selectedDay;
            const isTodayDay = d ? isToday(d) : false;
            const inRange    = d
              ? isInRange(d, periodStart, periodEnd, date.getFullYear(), date.getMonth())
              : false;
            return (
              <TouchableOpacity
                key={i}
                disabled={!d}
                onPress={() => {
                  if (!d) return;
                  setSelectedDay(d);
                  setActiveMode(null);
                  setPeriodStart(null);
                  setPeriodEnd(null);
                }}
                style={[
                  styles.dayBox,
                  isPeriod   && styles.dayBoxPeriod,
                  isSelected && styles.dayBoxSelected,
                  inRange && !isSelected && styles.dayBoxRange,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    isPeriod   && styles.dayTextPeriod,
                    isSelected && styles.dayTextSelected,
                    isTodayDay && !isSelected && styles.dayTextToday,
                  ]}
                >
                  {d ?? ""}
                </Text>
                {isTodayDay && !isSelected && <View style={styles.todayDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Panel Indicator ── */}
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
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.cardContent}
          >
            {selectedDay === null && (
              <View>
                <Text style={styles.cardTitle}>✦ About Your Cycle</Text>
                <View style={styles.statsRow}>
                  <StatCard
                    label="Next Period"
                    value={nextPeriodDays != null ? String(nextPeriodDays) : "--"}
                    unit="days away"
                    gradient={[C.blush, C.roseLight]}
                  />
                  <StatCard
                    label="Avg Period"
                    value={avgLength != null ? String(avgLength) : "--"}
                    unit="days"
                    gradient={[C.lavender, "#E8C9F5"]}
                  />
                </View>
                <View style={styles.statsRow}>
                  <StatCard
                    label="Cycle Length"
                    value={avgCycle != null ? String(avgCycle) : "--"}
                    unit="days"
                    gradient={[C.peach, "#FAD5B8"]}
                  />
                  <StatCard
                    label="Ovulation"
                    value={
                      ovulationDate
                        ? ovulationDate.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        : "--"
                    }
                    gradient={[C.mint, "#B8EAD8"]}
                  />
                </View>
                <LinearGradient
                  colors={["#FDE8F0", "#FAD5E2"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.wideCard}
                >
                  <Text style={styles.wideCardLabel}>Fertile Window</Text>
                  <Text style={styles.wideCardValue}>
                    {fertileStart && fertileEnd
                      ? `${fertileStart.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })} – ${fertileEnd.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}`
                      : "Not enough data yet"}
                  </Text>
                </LinearGradient>
                <LinearGradient
                  colors={["#EDE8FD", "#DDD5FA"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.wideCard}
                >
                  <Text style={styles.wideCardLabel}>Cycle Range</Text>
                  <Text style={styles.wideCardValue}>
                    {cycleRange
                      ? `${cycleRange.early.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })} – ${cycleRange.late.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}`
                      : "Not enough data yet"}
                  </Text>
                </LinearGradient>
              </View>
            )}

            {selectedDay !== null && (
              <View style={styles.modeRow}>
                {(["PERIOD", "PCOS"] as const).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => setActiveMode(mode)}
                    style={[styles.modePill, activeMode === mode && styles.modePillActive]}
                  >
                    <Text
                      style={[
                        styles.modePillText,
                        activeMode === mode && styles.modePillTextActive,
                      ]}
                    >
                      {mode === "PERIOD" ? "Period" : "PCOS"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Period form */}
            {selectedDay !== null && activeMode === "PERIOD" && (
              <View style={styles.formCard}>
                <LinearGradient colors={["#FFE8ED", "#FDD5DC"]} style={styles.formHeader}>
                  <Text style={styles.formTitle}>Period Log</Text>
                  <Text style={styles.formSubtitle}>
                    {new Date(
                      date.getFullYear(),
                      date.getMonth(),
                      selectedDay
                    ).toLocaleDateString("en-UK", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>
                </LinearGradient>
                <View style={styles.formBody}>
                  <SectionLabel>Period Dates</SectionLabel>
                  <View style={styles.dateRow}>
                    <TouchableOpacity
                      onPress={() => setShowStartPicker(true)}
                      style={styles.dateBtn}
                    >
                      <Text style={styles.dateBtnLabel}>Start</Text>
                      <Text style={styles.dateBtnValue}>
                        {periodStart
                          ? periodStart.toLocaleDateString("en-UK", {
                              month: "short",
                              day: "numeric",
                            })
                          : "Tap to set"}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.dateSeparator}>→</Text>
                    <TouchableOpacity
                      onPress={() => setShowEndPicker(true)}
                      style={styles.dateBtn}
                    >
                      <Text style={styles.dateBtnLabel}>End</Text>
                      <Text style={styles.dateBtnValue}>
                        {periodEnd
                          ? periodEnd.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          : "Tap to set"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {showStartPicker && (
                    <DateTimePicker
                      value={periodStart ?? new Date()}
                      mode="date"
                      onChange={(_, d) => {
                        setShowStartPicker(false);
                        if (d) setPeriodStart(d);
                      }}
                    />
                  )}
                  {showEndPicker && (
                    <DateTimePicker
                      value={periodEnd ?? new Date()}
                      mode="date"
                      onChange={(_, d) => {
                        setShowEndPicker(false);
                        if (d) setPeriodEnd(d);
                      }}
                    />
                  )}

                  <SectionLabel>Flow Intensity</SectionLabel>
                  <PillRow>
                    {BLEEDING_OPTIONS.map((b) => (
                      <OptionPill
                        key={b}
                        label={b}
                        selected={bleeding === b}
                        onPress={() => setBleeding(b)}
                      />
                    ))}
                  </PillRow>

                  <SectionLabel>Pain Level</SectionLabel>
                  <DotSlider value={painLevel} max={5} onChange={setPainLevel} color={C.roseDark} />

                  <SectionLabel>Symptoms</SectionLabel>
                  <PillRow>
                    {SYMPTOM_OPTIONS.map((s) => (
                      <OptionPill
                        key={s}
                        label={s}
                        selected={periodSymptoms.includes(s)}
                        onPress={() =>
                          setPeriodSymptoms((p) =>
                            p.includes(s) ? p.filter((x) => x !== s) : [...p, s]
                          )
                        }
                      />
                    ))}
                  </PillRow>

                  <SectionLabel>Mood</SectionLabel>
                  <View style={styles.moodRow}>
                    {MOOD_OPTIONS.map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.moodBtn, moods.includes(m) && styles.moodBtnSelected]}
                        onPress={() =>
                          setMoods((p) =>
                            p.includes(m) ? p.filter((x) => x !== m) : [...p, m]
                          )
                        }
                      >
                        <Text style={styles.moodEmoji}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <SectionLabel>Pad / Tampon Changes</SectionLabel>
                  <DotSlider value={padChanges} max={6} onChange={setPadChanges} color={C.peachDark} />

                  <SectionLabel>Notes</SectionLabel>
                  <TextInput
                    style={styles.notesInput}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="How are you feeling today?"
                    placeholderTextColor={C.textLight}
                    multiline
                    mode="outlined"
                    outlineColor={C.border}
                    activeOutlineColor={C.rose}
                  />

                  <View style={styles.actionRow}>
                    <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                      <LinearGradient
                        colors={[C.rose, C.roseDark]}
                        style={styles.saveBtnGradient}
                      >
                        <Text style={styles.saveBtnText}>Save</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* PCOS log form */}
            {selectedDay !== null && activeMode === "PCOS" && (
              <View style={styles.formCard}>
                <LinearGradient colors={["#EDE8FD", "#DDD5FA"]} style={styles.formHeader}>
                  <Text style={styles.formTitle}>PCOS Log</Text>
                  <Text style={styles.formSubtitle}>
                    {new Date(
                      date.getFullYear(),
                      date.getMonth(),
                      selectedDay
                    ).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>
                </LinearGradient>
                <View style={styles.formBody}>
                  <SectionLabel>Pain Level</SectionLabel>
                  <DotSlider value={painLevel} max={5} onChange={setPainLevel} color={C.lavDark} />

                  <SectionLabel>Mood</SectionLabel>
                  <View style={styles.moodRow}>
                    {MOOD_OPTIONS.map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[
                          styles.moodBtn,
                          moods.includes(m) && styles.moodBtnSelectedPurple,
                        ]}
                        onPress={() =>
                          setMoods((p) =>
                            p.includes(m) ? p.filter((x) => x !== m) : [...p, m]
                          )
                        }
                      >
                        <Text style={styles.moodEmoji}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <SectionLabel>Acne Level</SectionLabel>
                  <PillRow>
                    {ACNE_LEVELS.map((lvl) => (
                      <OptionPill
                        key={lvl}
                        label={lvl}
                        selected={acne_levels === lvl}
                        onPress={() => setAcneLevel(lvl)}
                      />
                    ))}
                  </PillRow>

                  <SectionLabel>Fatigue</SectionLabel>
                  <DotSlider value={fatigue} max={5} onChange={setFatigue} color={C.lavDark} />

                  <SectionLabel>Increased Appetite</SectionLabel>
                  <DotSlider
                    value={increasedAppetite}
                    max={5}
                    onChange={setIncreasedAppetite}
                    color={C.peachDark}
                  />

                  <SectionLabel>Bloating</SectionLabel>
                  <DotSlider value={bloating} max={5} onChange={setBloating} color={C.mintDark} />

                  <SectionLabel>Facial Hair</SectionLabel>
                  <View style={{ flexDirection: "row", gap: 12, marginVertical: 8 }}>
                    {(["YES", "NO"] as const).map((v) => (
                      <OptionPill
                        key={v}
                        label={v}
                        selected={facialHair === v}
                        onPress={() => setFacialHair(v)}
                      />
                    ))}
                  </View>

                  <SectionLabel>Stress Level</SectionLabel>
                  <DotSlider value={stressLevel} max={5} onChange={setStressLevel} color={C.rose} />

                  <SectionLabel>Hair Loss / Thinning</SectionLabel>
                  <View style={{ flexDirection: "row", gap: 12, marginVertical: 8 }}>
                    {([true, false] as const).map((v) => (
                      <OptionPill
                        key={String(v)}
                        label={v ? "YES" : "NO"}
                        selected={hairloss === v}
                        onPress={() => setHairloss(v)}
                      />
                    ))}
                  </View>

                  <SectionLabel>Irregular Bleeding</SectionLabel>
                  <View style={{ flexDirection: "row", gap: 12, marginVertical: 8 }}>
                    {([true, false] as const).map((v) => (
                      <OptionPill
                        key={String(v)}
                        label={v ? "YES" : "NO"}
                        selected={irregularBleeding === v}
                        onPress={() => setIrregularBleeding(v)}
                      />
                    ))}
                  </View>

                  <SectionLabel>Headache</SectionLabel>
                  <View style={{ flexDirection: "row", gap: 12, marginVertical: 8 }}>
                    {([true, false] as const).map((v) => (
                      <OptionPill
                        key={String(v)}
                        label={v ? "YES" : "NO"}
                        selected={headache === v}
                        onPress={() => setHeadache(v)}
                      />
                    ))}
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                      <LinearGradient
                        colors={[C.lavDark, "#8A55A8"]}
                        style={styles.saveBtnGradient}
                      >
                        <Text style={styles.saveBtnText}>Save</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </View>

        {/* ── Panel 1: PCOS Trends ── */}
        <View style={{ width: SCREEN_W }}>
          <PCOSTrendsPanel allLogs={allLogs} getDetailLog={getDetailLog} />
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 16 },

  monthRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, marginBottom: 12, marginTop: 60,
  },
  arrowBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: C.white,
    alignItems: "center", justifyContent: "center",
    shadowColor: C.rose, shadowOpacity: 0.2, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  arrowText: { fontSize: 22, color: C.roseDark, lineHeight: 26 },
  monthText: { fontSize: 18, fontWeight: "700", color: C.textDark, letterSpacing: 0.3 },

  calendarCard: {
    marginHorizontal: 16, backgroundColor: C.white, borderRadius: 24, padding: 12,
    shadowColor: C.rose, shadowOpacity: 0.12, shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
    marginBottom: 6, paddingBottom: 8,
  },
  weekRow:  { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  weekDay:  {
    width: "14%", textAlign: "center", fontSize: 11,
    fontWeight: "700", color: C.textLight, letterSpacing: 0.5,
  },
  daysGrid: { flexDirection: "row", flexWrap: "wrap" },

  dayBox:         { width: "14%", height: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, marginBottom: 2 },
  dayBoxPeriod:   { backgroundColor: C.blush },
  dayBoxSelected: {
    backgroundColor: C.roseDark,
    shadowColor: C.roseDark, shadowOpacity: 0.4, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  dayBoxRange:        { backgroundColor: "#FDEAF0" },
  dayText:            { fontSize: 14, fontWeight: "600", color: C.textDark },
  dayTextPeriod:      { color: C.roseDark },
  dayTextSelected:    { color: C.white, fontWeight: "800" },
  dayTextToday:       { color: C.rose, fontWeight: "800" },
  todayDot:           { width: 4, height: 4, borderRadius: 2, backgroundColor: C.rose, marginTop: 1 },

  panelIndicatorRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, marginBottom: 6, gap: 6,
  },
  panelDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: C.roseLight },
  panelDotActive: { backgroundColor: C.roseDark, width: 18 },
  swipeHint:      { fontSize: 11, color: C.textLight, fontWeight: "600", marginLeft: 4 },

  panelScroll: { flex: 1 },
  cardContent: { paddingHorizontal: 16, paddingBottom: 40 },

  cardTitle: { fontSize: 17, fontWeight: "800", color: C.textDark, marginBottom: 14, letterSpacing: 0.2 },
  statsRow:  { flexDirection: "row", gap: 12, marginBottom: 12 },
  statCard:  {
    flex: 1, borderRadius: 20, padding: 16, minHeight: 90, justifyContent: "space-between",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  statCardLabel: { fontSize: 11, fontWeight: "700", color: C.textMid, letterSpacing: 0.8, textTransform: "uppercase" },
  statCardValue: { fontSize: 30, fontWeight: "900", color: C.textDark },
  statCardUnit:  { fontSize: 12, fontWeight: "600", color: C.textLight },

  wideCard: {
    borderRadius: 20, padding: 16, marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  wideCardLabel: { fontSize: 13, fontWeight: "700", color: C.textMid, marginBottom: 6 },
  wideCardValue: { fontSize: 16, fontWeight: "800", color: C.textDark },

  modeRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  modePill: {
    flex: 1, paddingVertical: 12, borderRadius: 16, backgroundColor: C.white,
    alignItems: "center", borderWidth: 1.5, borderColor: C.border,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  modePillActive:     { backgroundColor: C.roseDark, borderColor: C.roseDark },
  modePillText:       { fontSize: 14, fontWeight: "700", color: C.textMid },
  modePillTextActive: { color: C.white },

  formCard: {
    backgroundColor: C.white, borderRadius: 24, overflow: "hidden",
    shadowColor: C.rose, shadowOpacity: 0.1, shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  formHeader:   { padding: 20, paddingBottom: 16 },
  formTitle:    { fontSize: 20, fontWeight: "900", color: C.textDark },
  formSubtitle: { fontSize: 13, color: C.textMid, marginTop: 2 },
  formBody:     { padding: 20 },
  sectionLabel: {
    fontSize: 13, fontWeight: "700", color: C.textMid, marginTop: 16, marginBottom: 4,
    letterSpacing: 0.4, textTransform: "uppercase",
  },

  dateRow:      { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 8 },
  dateBtn:      { flex: 1, backgroundColor: C.blush, borderRadius: 14, padding: 12, alignItems: "center" },
  dateBtnLabel: { fontSize: 11, fontWeight: "700", color: C.textLight, textTransform: "uppercase", letterSpacing: 0.5 },
  dateBtnValue: { fontSize: 15, fontWeight: "800", color: C.roseDark, marginTop: 2 },
  dateSeparator:{ fontSize: 18, color: C.textLight },

  optionPill:             { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#FFF0F3", borderWidth: 1.5, borderColor: C.border },
  optionPillSelected:     { backgroundColor: C.roseDark, borderColor: C.roseDark },
  optionPillText:         { fontSize: 13, fontWeight: "600", color: C.textMid },
  optionPillTextSelected: { color: C.white },

  dotSliderRow: { flexDirection: "row", gap: 8, marginVertical: 8, alignItems: "center" },
  dotSliderDot: { flex: 1, height: 8, borderRadius: 4, backgroundColor: "#F0E0E5" },

  moodRow:               { flexDirection: "row", gap: 8, marginVertical: 8 },
  moodBtn:               { width: 48, height: 48, borderRadius: 24, backgroundColor: "#FFF0F3", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: C.border },
  moodBtnSelected:       { backgroundColor: C.roseDark, borderColor: C.roseDark },
  moodBtnSelectedPurple: { backgroundColor: C.lavDark, borderColor: C.lavDark },
  moodEmoji:             { fontSize: 22 },

  notesInput: { backgroundColor: "#FFF8FA", borderRadius: 14, fontSize: 14, minHeight: 80, marginTop: 4 },

  actionRow:       { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelBtn:       { flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: "#F5E8EB", alignItems: "center" },
  cancelBtnText:   { fontSize: 15, fontWeight: "700", color: C.textMid },
  saveBtn:         { flex: 1, borderRadius: 16, overflow: "hidden" },
  saveBtnGradient: { paddingVertical: 14, alignItems: "center" },
  saveBtnText:     { fontSize: 15, fontWeight: "800", color: C.white, letterSpacing: 0.3 },
});