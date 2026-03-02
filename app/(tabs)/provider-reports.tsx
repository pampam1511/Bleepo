import { useAuth } from "@/lib/auth-context";
import { useProviderReport } from "@/lib/provider-access-context";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import {ActivityIndicator,ScrollView,StyleSheet,Text,TouchableOpacity,View,} from "react-native";

const C = { 
  cream:"#FFF8F5", white: "#FFFFFF", rose:"#E8929A", roseDark: "#C45C6A",
  blush:"#FADADD", roseLight: "#F9C5C9", mint: "#D4F0E8",mintDark:  "#6BBFA3",
  peach: "#FAE5D3", peachDark: "#E8A87C", lavender:  "#EDD9F5",lavDark:"#B07CC6",
  textDark:"#3D2030",textMid:"#7A4F5A",textLight: "#B08090",border:"#F0D5DA",};
  
  type GradientColors = [string, string, ...string[]];

function SectionCard({ title, emoji, children, gradient }: {
  title: string; emoji: string; children: React.ReactNode; gradient?:GradientColors;
}) {
  return (
    <View style={sc.card}>
      <LinearGradient colors={gradient ?? (["#FDE8ED", C.blush] as [string,string])} style={sc.header}>
        <Text style={sc.emoji}>{emoji}</Text>
        <Text style={sc.title}>{title}</Text>
      </LinearGradient>
      <View style={sc.body}>{children}</View>
    </View>
  );
}
const sc = StyleSheet.create({
  card:   { backgroundColor: C.white, borderRadius: 20, marginBottom: 16, overflow: "hidden", shadowColor: C.rose, shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  emoji:  { fontSize: 18 },
  title:  { fontSize: 15, fontWeight: "800", color: C.textDark },
  body:   { padding: 16 },
});

function DataRow({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={dr.row}>
      <Text style={dr.label}>{label}</Text>
      <Text style={dr.value}>{value}</Text>
    </View>
  );
}
const dr = StyleSheet.create({
  row:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F5EAED" },
  label: { fontSize: 13, fontWeight: "600", color: C.textMid, flex: 1 },
  value: { fontSize: 13, fontWeight: "800", color: C.textDark, textAlign: "right" },
});

function SymptomPill({ label }: { label: string }) {
  return (
    <View style={sp.pill}>
      <Text style={sp.text}>{label}</Text>
    </View>
  );
}
const sp = StyleSheet.create({
  pill: { backgroundColor: C.lavender, borderRadius: 12, paddingHorizontal: 12,
    paddingVertical: 5, marginRight: 6, marginBottom: 6 },
  text: { fontSize: 12, fontWeight: "700", color: C.lavDark },
});

const formatDate = (val: any) => {
  if (!val) return "—";
  const d = new Date(val);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

export default function ProviderReportsScreen() {
  const { getReportsForProvider } = useProviderReport();
  const { signOut }               = useAuth();

  const [reports,      setReports]      = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getReportsForProvider();
        setReports(data);
        // Auto-select first patient
        if (data.length > 0) setSelectedUser(data[0].patientId);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const patients = useMemo(() => {
    const map = new Map<string, string>();
    reports.forEach((r) => map.set(r.patientId, r.patientName ?? "Patient"));
    return Array.from(map.entries()).map(([patientId, patientName]) => ({ patientId, patientName }));
  }, [reports]);

  const visibleReports = useMemo(
    () => selectedUser ? reports.filter((r) => r.patientId === selectedUser) : reports,
    [reports, selectedUser]
  );

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={C.rose} />
        <Text style={styles.loadingTxt}>Loading patient reports…</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={[C.cream, "#FFF0F3", C.cream]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Patient Reports</Text>
            <Text style={styles.subtitle}>Shared health data from your patients</Text>
          </View>
        </View>

        {/* Patient selector */}
        <SectionCard title="My Patients" emoji="👥" gradient={[C.mint, "#B8EAD8"]}>
          {patients.length === 0 ? (
            <Text style={styles.muted}>No patients have shared reports with you yet.</Text>
          ) : (
            <View style={styles.patientRow}>
              {patients.map((p) => (
                <TouchableOpacity
                  key={p.patientId}
                  onPress={() => setSelectedUser((prev) => prev === p.patientId ? null : p.patientId)}
                  style={[styles.patientPill, selectedUser === p.patientId && styles.patientPillActive]}
                >
                  <Text style={[styles.patientTxt, selectedUser === p.patientId && styles.patientTxtActive]}>
                    {p.patientName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </SectionCard>

        {/* Reports */}
        {visibleReports.length === 0 && !loading && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.muted}>No reports found for this patient.</Text>
          </View>
        )}

        {visibleReports.map((r) => {
          const p = r.parsed ?? {};
          // Symptoms can be an array or comma-separated string depending on how they were serialised
          const symptoms: string[] = Array.isArray(p.symptoms)
            ? p.symptoms
            : typeof p.symptoms === "string" && p.symptoms
            ? p.symptoms.split(",").map((s: string) => s.trim()).filter(Boolean)
            : [];

          const pcosSymptoms: string[] = Array.isArray(p.pcosSymptoms)
            ? p.pcosSymptoms
            : typeof p.pcosSymptoms === "string" && p.pcosSymptoms
            ? p.pcosSymptoms.split(",").map((s: string) => s.trim()).filter(Boolean)
            : [];

          return (
            <View key={r.$id} style={styles.reportBlock}>

              {/* ── Activity ── */}
              <SectionCard title="Activity" emoji="👟" gradient={[C.peach, "#F5D5B8"]}>
                <DataRow label="Total Steps"       value={(p.stepsTotal ?? 0).toLocaleString()} />
                <DataRow label="Avg Steps / Day"   value={(p.stepsAvgPerDay ?? 0).toLocaleString()} />
                <DataRow label="Active Days"        value={p.activeDays ?? "—"} />
                <DataRow label="Distance (km)"      value={p.distanceKm ?? "—"} />
                <DataRow label="Calories Burned"    value={`${p.caloriesBurned ?? 0} kcal`} />
              </SectionCard>

              {/* ── Nutrition ── */}
              <SectionCard title="Nutrition" emoji="🥗" gradient={[C.mint, "#B8EAD8"]}>
                <DataRow label="Calorie Intake"     value={`${p.calIntakeTotal ?? 0} kcal`} />
                <DataRow label="Calorie Goal"        value={`${p.calGoal ?? 0} kcal`} />
                <DataRow label="Avg Protein / Day"  value={`${p.proteinAvg ?? 0}g`} />
                <DataRow label="Avg Carbs / Day"    value={`${p.carbsAvg ?? 0}g`} />
                <DataRow label="Avg Fat / Day"      value={`${p.fatAvg ?? 0}g`} />
              </SectionCard>

              {/* ── Weight ── */}
              {(p.weightKg || p.weightGoalKg) && (
                <SectionCard title="Weight" emoji="⚖️" gradient={[C.lavender, "#E2C8F0"]}>
                  <DataRow label="Current Weight"  value={p.weightKg ? `${p.weightKg} kg` : "—"} />
                  <DataRow label="Weight Goal"     value={p.weightGoalKg ? `${p.weightGoalKg} kg` : "—"} />
                  <DataRow label="BMI"             value={p.bmi ?? "—"} />
                </SectionCard>
              )}

              {/* ── Menstrual / Period symptoms ── */}
              <SectionCard title="Menstrual Health" emoji="🌸" gradient={["#FDE8ED", C.blush]}>
                <DataRow label="Cycle Length"      value={p.cycleLength      ? `${p.cycleLength} days`  : "—"} />
                <DataRow label="Period Length"     value={p.periodLength     ? `${p.periodLength} days` : "—"} />
                <DataRow label="Flow Intensity"    value={p.flowIntensity    ?? "—"} />
                <DataRow label="Last Period Start" value={formatDate(p.lastPeriodStart)} />
                <DataRow label="Next Period Est."  value={formatDate(p.nextPeriodEst)} />
                {symptoms.length > 0 && (
                  <View style={styles.symptomSection}>
                    <Text style={styles.symptomHeading}>Reported Symptoms</Text>
                    <View style={styles.symptomWrap}>
                      {symptoms.map((s) => <SymptomPill key={s} label={s} />)}
                    </View>
                  </View>
                )}
                {symptoms.length === 0 && (
                  <DataRow label="Symptoms" value="None reported" />
                )}
              </SectionCard>

              {/* ── PCOS symptoms ── */}
              {(pcosSymptoms.length > 0 || p.pcosRisk) && (
                <SectionCard title="PCOS Indicators" emoji="🔬" gradient={["#F3E8FD", C.lavender]}>
                  {p.pcosRisk && <DataRow label="Risk Level" value={p.pcosRisk} />}
                  {pcosSymptoms.length > 0 && (
                    <View style={styles.symptomSection}>
                      <Text style={styles.symptomHeading}>PCOS Symptoms</Text>
                      <View style={styles.symptomWrap}>
                        {pcosSymptoms.map((s) => <SymptomPill key={s} label={s} />)}
                      </View>
                    </View>
                  )}
                </SectionCard>
              )}

              {/* ── Mood & general notes ── */}
              {(p.moodAvg || p.notes) && (
                <SectionCard title="Mood & Notes" emoji="💭" gradient={[C.peach, "#FAD8C0"]}>
                  {p.moodAvg   && <DataRow label="Avg Mood Score" value={`${p.moodAvg} / 10`} />}
                  {p.notes     && <Text style={styles.notes}>{p.notes}</Text>}
                </SectionCard>
              )}

            </View>
          );
        })}
        <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
            <Text style={styles.signOutTxt}>Sign Out</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen:      { flex: 1 },
  scroll:      { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 48 },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.cream, gap: 12 },
  loadingTxt:  { color: C.textMid, fontWeight: "600" },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, marginTop: 60 },
  title:     { fontSize: 26, fontWeight: "900", color: C.textDark },
  subtitle:  { fontSize: 13, color: C.textLight, fontWeight: "600", marginTop: 2 },
  signOutBtn:{ backgroundColor: C.blush, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderColor: C.roseLight, borderWidth: 1,alignSelf: "center",  },
  signOutTxt:{ fontSize: 13, fontWeight: "700", color: C.roseDark },

  patientRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  patientPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border },
  patientPillActive: { backgroundColor: C.roseDark, borderColor: C.roseDark },
  patientTxt: { fontWeight: "700", fontSize: 14, color: C.textMid },
  patientTxtActive:  { color: C.white },

  muted: { color: C.textLight, fontWeight: "600", fontSize: 13 },
  emptyCard:  { backgroundColor: C.white, borderRadius: 20, padding: 32, alignItems: "center", marginBottom: 16 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },

  reportBlock:{ marginBottom: 24 },
  symptomSection: { marginTop: 10 },
  symptomHeading: { fontSize: 11, fontWeight: "700", color: C.textLight,textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  symptomWrap:{ flexDirection: "row", flexWrap: "wrap" },

  notes:{ fontSize: 13, color: C.textMid, fontWeight: "600", lineHeight: 20, marginTop: 4 },
});