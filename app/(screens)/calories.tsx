import { useHealth } from "@/lib/health /health-context";
import { useProfile } from "@/lib/profile-context";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const SCREEN_W = Dimensions.get("window").width;
const STEP_PER_KCAL = 20;

// ─── Colour palette (matches your profile screen) ───────────────────────────
const C = {blush:     "#FADADD", roseLight: "#F9C5C9", rose:      "#E8929A",  roseDark:  "#C45C6A",
          lavender:  "#EDD9F5",  lavDark:   "#B07CC6", peach:     "#FAE5D3",  peachDark: "#E8A87C", 
          mint:      "#D4F0E8", mintDark:  "#6BBFA3",  cream:     "#FFF8F5",  white:     "#FFFFFF",
          textDark:  "#3D2030", textMid:   "#7A4F5A", textLight: "#B08090", border:    "#F0D5DA",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function bmiColor(bmi: number) {
  if (!bmi) return C.textLight;
  if (bmi < 18.5) return "#5ba4cf";
  if (bmi < 25)   return C.mintDark;
  if (bmi < 30)   return C.peachDark;
  return C.roseDark;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Horizontal filled progress bar */
function NutritionBar({label,value,goal,color,unit = "g",
}: {
  label: string;
  value: number;
  goal: number;
  color: string;
  unit?: string;
}) {
  const pct = goal > 0 ? Math.min(1, value / goal) : 0;
  return (
    <View style={nb.row}>
      <Text style={nb.label}>{label}</Text>
      <View style={nb.trackWrap}>
        <View style={nb.track}>
          <View style={[nb.fill, { width: `${Math.round(pct * 100)}%`, backgroundColor: color }]} />
        </View>
        <Text style={nb.nums}>
          {value}
          <Text style={nb.goal}>/{goal}{unit}</Text>
        </Text>
      </View>
    </View>
  );
}
const nb = StyleSheet.create({
  row:      { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  label:    { width: 64, fontSize: 12, fontWeight: "700", color: C.textMid },
  trackWrap:{ flex: 1 },
  track:    { height: 10, backgroundColor: "#F0D5DA", borderRadius: 8, overflow: "hidden", marginBottom: 3 },
  fill:     { height: 10, borderRadius: 8 },
  nums:     { fontSize: 11, fontWeight: "700", color: C.textDark },
  goal:     { fontWeight: "400", color: C.textLight },
});

/** Mini circular arc-style calorie indicator (View-only, no SVG) */
function CalCircle({current,goal,size = 96,label,
}: {
  current: number;
  goal: number;
  size?: number;
  label: string;
}) {
  const pct = goal > 0 ? Math.min(1, current / goal) : 0;
  const pctText = `${Math.round(pct * 100)}%`;
  return (
    <View style={[cc.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      {/* background ring */}
      <View style={[cc.ring, { width: size, height: size, borderRadius: size / 2, borderColor: "#F0D5DA" }]} />
      {/* filled ring — simulated with border trick */}
      <View
        style={[
          cc.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: C.rose,
            borderTopColor: pct > 0.25 ? C.rose : "transparent",
            borderRightColor: pct > 0.5  ? C.rose : "transparent",
            borderBottomColor: pct > 0.75 ? C.rose : "transparent",
            transform: [{ rotate: "-90deg" }],
          },
        ]}
      />
      <View style={cc.inner}>
        <Text style={cc.pct}>{pctText}</Text>
        <Text style={cc.num}>{current}</Text>
        <View style={cc.divider} />
        <Text style={cc.goalTxt}>{goal}</Text>
        <Text style={cc.lbl}>{label}</Text>
      </View>
    </View>
  );
}
const cc = StyleSheet.create({
  wrap:    { alignItems: "center", justifyContent: "center", position: "relative" },
  ring:    { position: "absolute", borderWidth: 6 },
  inner:   { alignItems: "center" },
  pct:     { fontSize: 11, fontWeight: "800", color: C.rose },
  num:     { fontSize: 18, fontWeight: "900", color: C.textDark, lineHeight: 20 },
  divider: { width: 28, height: 1.5, backgroundColor: C.textMid, marginVertical: 3 },
  goalTxt: { fontSize: 14, fontWeight: "700", color: C.textDark, lineHeight: 16 },
  lbl:     { fontSize: 9, fontWeight: "700", color: C.textLight, textTransform: "uppercase", letterSpacing: 0.5 },
});

/** Spark-line weight chart (pure View bars) */
function WeightChart({
  logs,
  goalKg,
}: {
  logs: { date: string; weightKg: number }[];
  goalKg: number;
}) {
  if (logs.length < 2) {
    return (
      <View style={wc.empty}>
        <Text style={wc.emptyTxt}>Log at least 2 weigh-ins to see your chart</Text>
      </View>
    );
  }
  const weights = logs.map((l) => l.weightKg);
  const min = Math.min(...weights, goalKg || Infinity) - 1;
  const max = Math.max(...weights, goalKg || -Infinity) + 1;
  const range = max - min || 1;
  const BAR_W = Math.max(8, Math.floor((SCREEN_W - 80) / logs.length) - 4);
  const H = 80;

  return (
    <View>
      <View style={[wc.chartArea, { height: H }]}>
        {/* Goal line */}
        {goalKg > 0 && (
          <View
            style={[
              wc.goalLine,
              { bottom: ((goalKg - min) / range) * H },
            ]}
          />
        )}
        {/* Bars */}
        <View style={wc.barsRow}>
          {logs.map((l, i) => {
            const barH = Math.max(4, ((l.weightKg - min) / range) * H);
            const isLast = i === logs.length - 1;
            return (
              <View key={i} style={wc.barCol}>
                <View
                  style={[
                    wc.bar,
                    {
                      height: barH,
                      width: BAR_W,
                      backgroundColor: isLast ? C.roseDark : C.roseLight,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
      </View>
      {/* X-axis labels — show first, mid, last */}
      <View style={wc.xRow}>
        {Array.from(new Set([0, Math.floor(logs.length / 2), logs.length - 1]))
        .map((idx) => {
          const d = new Date(logs[idx]?.date);
          return (
          <Text key={`x-${idx}`} style={wc.xLabel}>
            {d.getDate()}/{d.getMonth() + 1}
          </Text>
          );
          })}
      </View>
      {/* Latest vs goal summary */}
      <View style={wc.summaryRow}>
        <View style={wc.summaryBox}>
          <Text style={wc.summaryVal}>{logs[logs.length - 1].weightKg}kg</Text>
          <Text style={wc.summaryLbl}>Current</Text>
        </View>
        {goalKg > 0 && (
          <>
            <View style={wc.summaryBox}>
              <Text style={[wc.summaryVal, { color: C.mintDark }]}>{goalKg}kg</Text>
              <Text style={wc.summaryLbl}>Goal</Text>
            </View>
            <View style={wc.summaryBox}>
              <Text
                style={[
                  wc.summaryVal,
                  { color: logs[logs.length - 1].weightKg <= goalKg ? C.mintDark : C.roseDark },
                ]}
              >
                {(logs[logs.length - 1].weightKg - goalKg).toFixed(1)}kg
              </Text>
              <Text style={wc.summaryLbl}>To Go</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}
const wc = StyleSheet.create({
  empty:      { paddingVertical: 16, alignItems: "center" },
  emptyTxt:   { fontSize: 12, color: C.textLight, fontWeight: "600", textAlign: "center" },
  chartArea:  { position: "relative", justifyContent: "flex-end" },
  goalLine:   { position: "absolute", left: 0, right: 0, height: 1.5, backgroundColor: C.mintDark, opacity: 0.7 },
  barsRow:    { flexDirection: "row", alignItems: "flex-end", gap: 3 },
  barCol:     { alignItems: "center" },
  bar:        { borderRadius: 4 },
  xRow:       { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  xLabel:     { fontSize: 10, color: C.textLight, fontWeight: "600" },
  summaryRow: { flexDirection: "row", gap: 12, marginTop: 14 },
  summaryBox: { flex: 1, backgroundColor: "#FFF5F7", borderRadius: 12, padding: 10, alignItems: "center",
    borderWidth: 1, borderColor: C.border },
  summaryVal: { fontSize: 16, fontWeight: "900", color: C.textDark },
  summaryLbl: { fontSize: 10, color: C.textLight, fontWeight: "700", marginTop: 2 },
});

/** Section card wrapper */
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

// ─── Modal wrapper ────────────────────────────────────────────────────────────
function FormModal({
  visible,
  title,
  onClose,
  onSave,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={fm.backdrop}>
        <View style={fm.card}>
          <Text style={fm.title}>{title}</Text>
          {children}
          <View style={fm.actions}>
            <Pressable onPress={onClose} style={fm.cancelBtn}>
              <Text style={fm.cancelTxt}>Cancel</Text>
            </Pressable>
            <Pressable onPress={onSave} style={fm.saveBtn}>
              <Text style={fm.saveTxt}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
function ModalField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={fm.label}>{label}</Text>
      <TextInput style={fm.input} keyboardType="decimal-pad" value={value} onChangeText={onChange} />
    </View>
  );
}
const fm = StyleSheet.create({
  backdrop:  { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", alignItems: "center" },
  card:      { width: "88%", backgroundColor: C.white, borderRadius: 20, padding: 22 },
  title:     { fontSize: 17, fontWeight: "900", color: C.textDark, marginBottom: 16 },
  label:     { fontSize: 11, fontWeight: "700", color: C.textLight, textTransform: "uppercase",
    letterSpacing: 0.5, marginBottom: 6 },
  input:     { backgroundColor: "#FFF5F7", borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14,
    fontSize: 15, color: C.textDark, borderWidth: 1.5, borderColor: C.border },
  actions:   { flexDirection: "row", justifyContent: "flex-end", gap: 16, marginTop: 8 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  cancelTxt: { fontWeight: "700", color: C.textLight },
  saveBtn:   { backgroundColor: C.roseDark, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 22 },
  saveTxt:   { fontWeight: "800", color: C.white },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function CalorieScreen() {
  const router = useRouter();
  const {
    getTodayCalories,
    saveTodayCalories,
    getTodayNutrition,
    saveTodayNutrition,
    getStepsDaily,
    getWeightLogs,
    logWeight,
    calculateBMI,
    bmiCategory,
  } = useHealth();

  const { getUserProfile } = useProfile();

  // ── Calorie state ──
  const [currentIntake, setCurrentIntake] = useState("0");
  const [goalIntake,    setGoalIntake]    = useState("2000");
  const [burnedCalories,setBurnedCalories]= useState("0");
  const [burnedGoal,    setBurnedGoal]    = useState("500");
  const [burnedSource,  setBurnedSource]  = useState<"steps" | "manual">("steps");

  // ── Nutrition state ──
  const [carbs,       setCarbs]       = useState("0");
  const [fat,         setFat]         = useState("0");
  const [protein,     setProtein]     = useState("0");
  const [carbsGoal,   setCarbsGoal]   = useState("250");
  const [fatGoal,     setFatGoal]     = useState("65");
  const [proteinGoal, setProteinGoal] = useState("150");

  // ── Weight / BMI state ──
  const [weightLogs,   setWeightLogs]   = useState<any[]>([]);
  const [heightCm,     setHeightCm]     = useState(0);
  const [weightGoalKg, setWeightGoalKg] = useState(0);
  const [newWeight,    setNewWeight]    = useState("");

  // ── Modal visibility ──
  const [intakeModal,    setIntakeModal]    = useState(false);
  const [burnedModal,    setBurnedModal]    = useState(false);
  const [nutritionModal, setNutritionModal] = useState(false);
  const [weightModal,    setWeightModal]    = useState(false);

  // ── Derived ──
  const latestWeight = weightLogs.length ? weightLogs[weightLogs.length - 1].weightKg : 0;
  const bmi     = heightCm > 0 && latestWeight > 0 ? calculateBMI(latestWeight, heightCm) : 0;
  const bmiCat  = bmiCategory(bmi);
  const intakePct = Number(goalIntake) > 0
    ? Math.min(100, Math.round((Number(currentIntake) / Number(goalIntake)) * 100))
    : 0;

  // ── Load everything ──
  const loadAll = useCallback(async () => {
    try {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end   = new Date(); end.setHours(23, 59, 59, 999);

      const [calDoc, nDoc, stepLogs, wLogs, profile] = await Promise.all([
        getTodayCalories(),
        getTodayNutrition(),
        getStepsDaily(start, end),
        getWeightLogs(60),
        getUserProfile(),
      ]);

      // Profile (height + weight goal)
      if (profile) {
        setHeightCm(Number(profile.heightCm ?? 0));
        setWeightGoalKg(Number(profile.weightGoalKg ?? 0));
      }

      // Weight logs
      setWeightLogs(wLogs);

      // Steps → auto burned calories
      const todaySteps  = stepLogs.reduce((s: number, x: any) => s + Number(x.steps ?? 0), 0);
      const autoBurned  = Math.round(todaySteps / STEP_PER_KCAL);

      // Calorie doc
      if (calDoc) {
        const target  = Number(calDoc.targetCalories   ?? 2000);
        const intake  = Number(calDoc.dailyCaloriesIntake ?? 0);
        const dbBurned = Number(calDoc.burnedCalories  ?? 0);
        const dbGoal   = Number(calDoc.burnedGoal      ?? 500);
        const source   = (calDoc.burnedSource as "steps" | "manual") ?? "steps";

        setGoalIntake(String(target));
        setCurrentIntake(String(intake));
        setBurnedGoal(String(dbGoal));
        setBurnedSource(source);

        if (source === "manual") {
          setBurnedCalories(String(dbBurned));
        } else {
          setBurnedCalories(String(autoBurned));
          if (dbBurned !== autoBurned) {
            await saveTodayCalories({
              targetCalories: target,
              dailyCalories: intake,
              burnedCalories: autoBurned,
              burnedGoal: dbGoal,
              burnedSource: "steps",
              goalStatus: "active",
            });
          }
        }
      } else {
        // First record of day
        setBurnedCalories(String(autoBurned));
        await saveTodayCalories({
          targetCalories: 2000,
          dailyCalories: 0,
          burnedCalories: autoBurned,
          burnedGoal: 500,
          burnedSource: "steps",
          goalStatus: "active",
        });
      }

      // Nutrition
      if (nDoc) {
        setCarbs(String(nDoc.carbs    ?? 0));
        setFat(String(nDoc.fat        ?? 0));
        setProtein(String(nDoc.protein ?? 0));
        // Load goals if stored
        if (nDoc.carbsGoal)   setCarbsGoal(String(nDoc.carbsGoal));
        if (nDoc.fatGoal)     setFatGoal(String(nDoc.fatGoal));
        if (nDoc.proteinGoal) setProteinGoal(String(nDoc.proteinGoal));
      }
    } catch (err) {
      console.error("CalorieScreen loadAll failed:", err);
    }
  }, [getTodayCalories, getTodayNutrition, getStepsDaily, getWeightLogs, getUserProfile, saveTodayCalories]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  // ── Save handlers ──
  const saveIntake = async () => {
    await saveTodayCalories({
      targetCalories: Number(goalIntake  || 0),
      dailyCalories:  Number(currentIntake || 0),
      burnedCalories: Number(burnedCalories || 0),
      burnedGoal:     Number(burnedGoal  || 0),
      burnedSource,
      goalStatus: "active",
    });
    setIntakeModal(false);
  };

  const saveBurned = async () => {
    await saveTodayCalories({
      targetCalories: Number(goalIntake  || 0),
      dailyCalories:  Number(currentIntake || 0),
      burnedCalories: Number(burnedCalories || 0),
      burnedGoal:     Number(burnedGoal  || 0),
      burnedSource: "manual",
      goalStatus: "active",
    });
    setBurnedSource("manual");
    setBurnedModal(false);
  };

  const saveNutrition = async () => {
    await saveTodayNutrition({
      carbs:   Number(carbs   || 0),
      fat:     Number(fat     || 0),
      protein: Number(protein || 0),
      carbsGoal:   Number(carbsGoal   || 0),
      fatGoal:     Number(fatGoal     || 0),
      proteinGoal: Number(proteinGoal || 0),
    });
    setNutritionModal(false);
  };

  const saveWeight = async () => {
    const w = parseFloat(newWeight);
    if (!w || w <= 0) return;
    await logWeight(w, heightCm);
    setNewWeight("");
    setWeightModal(false);
    const fresh = await getWeightLogs(60);
    setWeightLogs(fresh);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <TouchableOpacity onPress={() => router.push("/")} style={styles.backBtn}>
        <Text style={styles.backTxt}>← Back to Home</Text>
      </TouchableOpacity>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Calories & Weight</Text>
        <View style={styles.todayPill}><Text style={styles.todayTxt}>Today</Text></View>
      </View>

      {/* ── BMI Card ── */}
      <SectionCard title="BMI & Body" emoji="">
        <View style={styles.bmiRow}>
          <View style={styles.bmiLeft}>
            <Text style={[styles.bmiNum, { color: bmiColor(bmi) }]}>
              {bmi > 0 ? bmi : "—"}
            </Text>
            <Text style={styles.bmiLabel}>BMI</Text>
          </View>
          <View style={styles.bmiRight}>
            <View style={[styles.bmiCatPill, { backgroundColor: bmiColor(bmi) + "22" }]}>
              <Text style={[styles.bmiCatTxt, { color: bmiColor(bmi) }]}>{bmiCat || "—"}</Text>
            </View>
            <Text style={styles.bmiSub}>
              {heightCm > 0 ? `${heightCm}cm  ·  ${latestWeight > 0 ? latestWeight + "kg" : "—"}` : "Set height in Profile"}
            </Text>
          </View>
        </View>
        {/* BMI scale bar */}
        <View style={styles.scaleWrap}>
          {[
            { label: "Under", color: "#5ba4cf", w: "20%" },
            { label: "Normal", color: C.mintDark, w: "25%" },
            { label: "Over", color: C.peachDark, w: "25%" },
            { label: "Obese", color: C.roseDark, w: "30%" },
          ].map((seg) => (
            <View key={seg.label} style={[styles.scaleSeg, { width: seg.w as any, backgroundColor: seg.color }]}>
              <Text style={styles.scaleLabel}>{seg.label}</Text>
            </View>
          ))}
          {/* marker */}
          {bmi > 0 && bmi < 45 && (
            <View style={[styles.scaleMarker, { left: `${Math.min(95, ((bmi - 10) / 35) * 100)}%` as any }]} />
          )}
        </View>
      </SectionCard>

      {/* ── Weight Progress ── */}
      <SectionCard title="Weight Progress" emoji="">
        <WeightChart logs={weightLogs} goalKg={weightGoalKg} />
        <TouchableOpacity style={styles.addWeightBtn} onPress={() => setWeightModal(true)}>
          <Text style={styles.addWeightTxt}>+ Log Weight</Text>
        </TouchableOpacity>
      </SectionCard>

      {/* ── Calorie Intake ── */}
      <Pressable onPress={() => setIntakeModal(true)}>
        <SectionCard title="Calorie Intake" emoji="">
          <View style={styles.calRow}>
            <CalCircle current={Number(currentIntake)} goal={Number(goalIntake)} label="Intake" />
            <View style={styles.calDetails}>
              <View style={styles.calDetailRow}>
                <View style={[styles.calDot, { backgroundColor: C.rose }]} />
                <Text style={styles.calDetailLbl}>Consumed</Text>
                <Text style={styles.calDetailVal}>{currentIntake} kcal</Text>
              </View>
              <View style={styles.calDetailRow}>
                <View style={[styles.calDot, { backgroundColor: "#F0D5DA" }]} />
                <Text style={styles.calDetailLbl}>Goal</Text>
                <Text style={styles.calDetailVal}>{goalIntake} kcal</Text>
              </View>
              <View style={styles.calDetailRow}>
                <View style={[styles.calDot, { backgroundColor: C.mintDark }]} />
                <Text style={styles.calDetailLbl}>Remaining</Text>
                <Text style={[styles.calDetailVal, { color: C.mintDark }]}>
                  {Math.max(0, Number(goalIntake) - Number(currentIntake))} kcal
                </Text>
              </View>
              <View style={[styles.intakePill, { backgroundColor: intakePct >= 100 ? C.roseDark : C.rose }]}>
                <Text style={styles.intakePillTxt}>{intakePct}% of goal</Text>
              </View>
            </View>
          </View>
        </SectionCard>
      </Pressable>

      {/* ── Calories Burned ── */}
      <Pressable onPress={() => setBurnedModal(true)}>
        <SectionCard title="Calories Burned" emoji="">
          <View style={styles.calRow}>
            <CalCircle current={Number(burnedCalories)} goal={Number(burnedGoal)} label="Burned" size={90} />
            <View style={styles.calDetails}>
              <View style={styles.calDetailRow}>
                <View style={[styles.calDot, { backgroundColor: C.peachDark }]} />
                <Text style={styles.calDetailLbl}>Burned</Text>
                <Text style={styles.calDetailVal}>{burnedCalories} kcal</Text>
              </View>
              <View style={styles.calDetailRow}>
                <View style={[styles.calDot, { backgroundColor: "#F0D5DA" }]} />
                <Text style={styles.calDetailLbl}>Goal</Text>
                <Text style={styles.calDetailVal}>{burnedGoal} kcal</Text>
              </View>
              <View style={styles.sourcePill}>
                <Text style={styles.sourceTxt}>
                  {burnedSource === "steps" ? "⚡ Auto from steps" : "✏️ Manual entry"}
                </Text>
              </View>
            </View>
          </View>
        </SectionCard>
      </Pressable>

      {/* ── Nutrition ── */}
      <Pressable onPress={() => setNutritionModal(true)}>
        <SectionCard title="Nutrition" emoji="">
          <NutritionBar label="Carbs"   value={Number(carbs)}   goal={Number(carbsGoal)}   color={C.peachDark} />
          <NutritionBar label="Fat"     value={Number(fat)}     goal={Number(fatGoal)}     color={C.lavDark}   />
          <NutritionBar label="Protein" value={Number(protein)} goal={Number(proteinGoal)} color={C.mintDark}  />
          <Text style={styles.tapHint}>Tap to update</Text>
        </SectionCard>
      </Pressable>

      {/* ── Modals ── */}

      {/* Intake modal */}
      <FormModal
        visible={intakeModal}
        title="Daily Calorie Intake"
        onClose={() => setIntakeModal(false)}
        onSave={saveIntake}
      >
        <ModalField label="Calories Consumed (kcal)" value={currentIntake} onChange={setCurrentIntake} />
        <ModalField label="Daily Goal (kcal)"         value={goalIntake}    onChange={setGoalIntake}    />
      </FormModal>

      {/* Burned modal */}
      <FormModal
        visible={burnedModal}
        title="Calories Burned"
        onClose={() => setBurnedModal(false)}
        onSave={saveBurned}
      >
        <ModalField label="Calories Burned (kcal)" value={burnedCalories} onChange={setBurnedCalories} />
        <ModalField label="Burn Goal (kcal)"        value={burnedGoal}    onChange={setBurnedGoal}     />
      </FormModal>

      {/* Nutrition modal */}
      <FormModal
        visible={nutritionModal}
        title="Nutrition"
        onClose={() => setNutritionModal(false)}
        onSave={saveNutrition}
      >
        <ModalField label="Carbs (g)"         value={carbs}       onChange={setCarbs}       />
        <ModalField label="Carbs Goal (g)"    value={carbsGoal}   onChange={setCarbsGoal}   />
        <ModalField label="Fat (g)"           value={fat}         onChange={setFat}         />
        <ModalField label="Fat Goal (g)"      value={fatGoal}     onChange={setFatGoal}     />
        <ModalField label="Protein (g)"       value={protein}     onChange={setProtein}     />
        <ModalField label="Protein Goal (g)"  value={proteinGoal} onChange={setProteinGoal} />
      </FormModal>

      {/* Weight modal */}
      <FormModal
        visible={weightModal}
        title="Log Today's Weight"
        onClose={() => setWeightModal(false)}
        onSave={saveWeight}
      >
        <ModalField label="Weight (kg)" value={newWeight} onChange={setNewWeight} />
        {heightCm > 0 && newWeight !== "" && Number(newWeight) > 0 && (
          <View style={styles.bmiPreview}>
            <Text style={styles.bmiPreviewTxt}>
              BMI preview: {calculateBMI(Number(newWeight), heightCm)} — {bmiCategory(calculateBMI(Number(newWeight), heightCm))}
            </Text>
          </View>
        )}
      </FormModal>

    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream },
  scroll: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 48 },

  backBtn: { marginTop: 45,marginBottom: 30 },
  backTxt: { fontWeight: "700", color: C.textMid },

  titleRow:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  title:     { fontSize: 24, fontWeight: "900", color: C.textDark },
  todayPill: { backgroundColor: "#F0D5DA", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  todayTxt:  { fontWeight: "700", color: C.roseDark, fontSize: 13 },

  // BMI
  bmiRow:    { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 16 },
  bmiLeft:   { alignItems: "center", width: 72 },
  bmiNum:    { fontSize: 36, fontWeight: "900" },
  bmiLabel:  { fontSize: 11, fontWeight: "700", color: C.textLight, textTransform: "uppercase" },
  bmiRight:  { flex: 1, gap: 8 },
  bmiCatPill:{ alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  bmiCatTxt: { fontWeight: "800", fontSize: 14 },
  bmiSub:    { fontSize: 12, color: C.textLight, fontWeight: "600" },

  scaleWrap:   { flexDirection: "row", height: 22, borderRadius: 11, overflow: "hidden", position: "relative" },
  scaleSeg:    { justifyContent: "center", alignItems: "center" },
  scaleLabel:  { fontSize: 8, fontWeight: "800", color: C.white },
  scaleMarker: { position: "absolute", top: 2, width: 4, height: 18, backgroundColor: C.textDark,
    borderRadius: 2, marginLeft: -2 },

  // Weight chart
  addWeightBtn: { marginTop: 14, backgroundColor: C.roseDark, borderRadius: 12,
    paddingVertical: 11, alignItems: "center" },
  addWeightTxt: { color: C.white, fontWeight: "800", fontSize: 14 },

  // Calorie cards
  calRow:       { flexDirection: "row", alignItems: "center", gap: 16 },
  calDetails:   { flex: 1, gap: 8 },
  calDetailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  calDot:       { width: 8, height: 8, borderRadius: 4 },
  calDetailLbl: { flex: 1, fontSize: 12, fontWeight: "600", color: C.textMid },
  calDetailVal: { fontSize: 13, fontWeight: "800", color: C.textDark },
  intakePill:   { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, marginTop: 4 },
  intakePillTxt:{ fontSize: 11, fontWeight: "800", color: C.white },
  sourcePill:   { alignSelf: "flex-start", backgroundColor: "#FFF5F7", paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  sourceTxt:    { fontSize: 11, fontWeight: "700", color: C.textMid },

  tapHint: { fontSize: 11, color: C.textLight, fontWeight: "600", textAlign: "right", marginTop: 4 },

  // BMI preview in weight modal
  bmiPreview:    { backgroundColor: "#FFF5F7", borderRadius: 10, padding: 10, marginTop: 4 },
  bmiPreviewTxt: { fontSize: 13, fontWeight: "700", color: C.textMid },
});