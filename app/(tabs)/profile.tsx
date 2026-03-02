import { useAuth } from "@/lib/auth-context";
import { useHealth } from "@/lib/health /health-context";
import { useProfile } from "@/lib/profile-context";
import { useProviderReport } from "@/lib/provider-access-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useEffect, useMemo, useState } from "react";
import {Keyboard,ScrollView,StyleSheet,Text,TextInput,TouchableOpacity,View,} from "react-native";

function AccordionCard({ title, emoji, gradient, open, onToggle, children }: {
  title: string; emoji: string; gradient: [string, string];
  open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <View style={s.card}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.8}>
        <LinearGradient colors={gradient} style={s.cardHeader}>
          <View style={s.cardHeaderLeft}>
            <Text style={s.cardEmoji}>{emoji}</Text>
            <Text style={s.cardTitle}>{title}</Text>
          </View>
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={C.textMid} />
        </LinearGradient>
      </TouchableOpacity>
      {open && <View style={s.cardBody}>{children}</View>}
    </View>
  );
}

function Field({ label, value, onChangeText, keyboard = "number-pad" }: {
  label: string; value: string; onChangeText: (v: string) => void; keyboard?: any;
}) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput style={s.fieldInput} value={value} onChangeText={onChangeText}
        keyboardType={keyboard} placeholderTextColor={C.textLight} />
    </View>
  );
}

function Bubble({ label, value, gradient }: {
  label: string; value: string | number; gradient: [string, string];
}) {
  return (
    <LinearGradient colors={gradient} style={s.bubble}>
      <Text style={s.bubbleValue}>{value}</Text>
      <Text style={s.bubbleLabel}>{label}</Text>
    </LinearGradient>
  );
}

function ReportRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.reportRow}>
      <Text style={s.reportRowLabel}>{label}</Text>
      <Text style={s.reportRowValue}>{value}</Text>
    </View>
  );
}

export default function profileScreen() {
  const { signOut } = useAuth();
  const { getUserProfile, saveUserProfile } = useProfile();
  const { fetchAllLogs, getPeriodStats, getStepsDaily, getCaloriesRange } = useHealth();
  const [heightCm,     setHeightCm]     = useState("0");
  const [weightKg,     setWeightKg]     = useState("0");
  const [weightGoalKg, setWeightGoalKg] = useState("0");
  const [openPersonal, setOpenPersonal] = useState(false);
  const [reportRange,    setReportRange]    = useState<"WEEKLY" | "MONTHLY" | "YEARLY">("WEEKLY");
  const [stepsTotal,     setStepsTotal]     = useState(0);
  const [stepsAvg,       setStepsAvg]       = useState(0);
  const [calIntakeTotal, setCalIntakeTotal] = useState(0);
  const [calBurnedTotal, setCalBurnedTotal] = useState(0);
  const [pcosCount,      setPcosCount]      = useState(0);
  const [rangeLogs,      setRangeLogs]      = useState<any[]>([]);
  const [openReports,    setOpenReports]    = useState(false);
  const { listProviders, getMyProviders, grantAccess, revokeAccess, publishReportForActiveProviders } = useProviderReport();
  const [providers,    setProviders]    = useState<any[]>([]);
  const [myAccess,     setMyAccess]     = useState<any[]>([]);
  const [dataSharing,  setDataSharing]  = useState(false);

  useEffect(() => {
    const load = async () => {
      const doc = await getUserProfile();
      if (doc) {
        setHeightCm(String(doc.heightCm ?? 0));
        setWeightKg(String(doc.weightKg ?? 0));
        setWeightGoalKg(String(doc.weightGoalKg ?? 0));
        setDataSharing(doc.dataSharing ?? false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadProviders = async () => {
      const all    = await listProviders();
      const access = await getMyProviders();
      setProviders(all);
      setMyAccess(access);
    };
    loadProviders();
  }, []);

  const getRange = () => {
    const end = new Date(); end.setHours(23, 59, 59, 999);
    const start = new Date(); start.setHours(0, 0, 0, 0);
    if (reportRange === "WEEKLY")       start.setDate(start.getDate() - 7);
    else if (reportRange === "MONTHLY") start.setMonth(start.getMonth() - 1);
    else                                start.setFullYear(start.getFullYear() - 1);
    return { start, end };
  };

  useEffect(() => {
    const loadRangeData = async () => {
      const { start, end } = getRange();
      const stepsLogs = await getStepsDaily(start, end);
      const stepsSum  = stepsLogs.reduce((s, x) => s + (x.steps ?? 0), 0);
      setStepsTotal(stepsSum);
      setStepsAvg(stepsLogs.length ? Math.round(stepsSum / stepsLogs.length) : 0);
      const calLogs = await getCaloriesRange(start, end);
      setCalIntakeTotal(calLogs.reduce((s, x) => s + (x.dailyCaloriesIntake ?? 0), 0));
      setCalBurnedTotal(calLogs.reduce((s, x) => s + (x.burnedCalories ?? 0), 0));
      const allLogs  = await fetchAllLogs();
      const filtered = allLogs.filter((l) => { const d = new Date(l.date); return d >= start && d <= end; });
      setRangeLogs(filtered);
      setPcosCount(filtered.filter((l) => String(l.type).toUpperCase() === "PCOS").length);
    };
    loadRangeData();
  }, [reportRange]);

  const bmi = Number(heightCm) > 0
    ? (Number(weightKg) / Math.pow(Number(heightCm) / 100, 2)).toFixed(1)
    : "--";

  const bmiCategory =
    bmi === "--"          ? ""
    : Number(bmi) < 18.5  ? "Underweight"
    : Number(bmi) < 25    ? "Healthy ✓"
    : Number(bmi) < 30    ? "Overweight"
    :                        "Obese";

  const bmiGradient: [string, string] =
    bmiCategory.includes("Healthy") ? [C.mint, "#B8EAD8"]
    : bmiCategory === "Underweight" ? [C.lavender, "#E8C9F5"]
    : [C.peach, "#FAD5B8"];

  const { avgLength, avgCycle, nextPeriodDate, ovulationDate, fertileStart, fertileEnd, cycleRange } =
    useMemo(() => getPeriodStats(rangeLogs), [rangeLogs]);

  const handleSave = async () => {
    await saveUserProfile({
      heightCm: Number(heightCm || 0), weightKg: Number(weightKg || 0),
      weightGoalKg: Number(weightGoalKg || 0), dataSharing,
    });
    Keyboard.dismiss();
  };

  const onShareReport = async () => {
    const { start, end } = getRange();
    await publishReportForActiveProviders({
      range: reportRange,
      periodStart: start.toISOString(), periodEnd: end.toISOString(),
      reportJson: { stepsTotal, stepsAvg, calIntakeTotal, calBurnedTotal, avgLength, avgCycle, pcosCount, },
    });
  };

  const exportPdf = async () => {
    const html = `<html><head><style>
      body{font-family:Arial,sans-serif;padding:24px;color:#222}
      h1{color:#f06292;text-align:center;margin-bottom:4px}
      h2{color:#009688;margin-top:24px;margin-bottom:8px;font-size:16px}
      .sub{text-align:center;color:#888;font-size:12px;margin-bottom:18px}
      table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:13px}
      th{background:#f8bbd0;text-align:left;padding:8px;font-size:12px}
      td{padding:8px;border-bottom:1px solid #eee}
      .footer{text-align:center;font-size:11px;color:#999;margin-top:24px}
    </style></head><body>
      <h1>Health Report</h1><div class="sub">${reportRange} summary</div>
      <h2>Steps & Calories</h2>
      <table>
        <tr><th>Metric</th><th>Value</th></tr>
        <tr><td>Steps Total</td><td>${stepsTotal}</td></tr>
        <tr><td>Steps Avg / Day</td><td>${stepsAvg}</td></tr>
        <tr><td>Calories Intake</td><td>${calIntakeTotal}</td></tr>
        <tr><td>Calories Burned</td><td>${calBurnedTotal}</td></tr>
      </table>
      <h2>Cycle Summary</h2>
      <table>
        <tr><th>Metric</th><th>Value</th></tr>
        <tr><td>Avg Period Length</td><td>${avgLength ?? "--"} days</td></tr>
        <tr><td>Cycle Length</td><td>${avgCycle ?? "--"} days</td></tr>
        <tr><td>Next Period</td><td>${nextPeriodDate ? nextPeriodDate.toDateString() : "--"}</td></tr>
        <tr><td>Ovulation</td><td>${ovulationDate ? ovulationDate.toDateString() : "--"}</td></tr>
        <tr><td>Fertile Window</td><td>${fertileStart && fertileEnd ? `${fertileStart.toDateString()} - ${fertileEnd.toDateString()}` : "--"}</td></tr>
        <tr><td>Cycle Range</td><td>${cycleRange ? `${cycleRange.early.toDateString()} - ${cycleRange.late.toDateString()}` : "--"}</td></tr>
      </table>
      <h2>PCOS Summary</h2>
      <table><tr><th>Metric</th><th>Value</th></tr><tr><td>PCOS Entries</td><td>${pcosCount} days</td></tr></table>
      <div class="footer">Generated by your health app</div>
    </body></html>`;
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
  };

  return (
    <LinearGradient colors={[C.cream, "#FFF0F3", C.cream]} style={s.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Avatar header ── */}
        <View style={s.avatarRow}>
          <LinearGradient colors={[C.rose, C.roseDark]} style={s.avatar}>
            <Text style={s.avatarEmoji}>🌸</Text>
          </LinearGradient>
          <View>
            <Text style={s.greeting}>My Profile</Text>
            <Text style={s.greetingSub}>Health & personal settings</Text>
          </View>
        </View>

        {/* ── Personal Details ── */}
        <AccordionCard title="Personal Details" emoji=""
          gradient={["#FDE8ED", "#FAD5DC"]}
          open={openPersonal} onToggle={() => setOpenPersonal((p) => !p)}>
          <Field label="Height (cm)"      value={heightCm}     onChangeText={setHeightCm} />
          <Field label="Weight (kg)"      value={weightKg}     onChangeText={setWeightKg} />
          <Field label="Weight Goal (kg)" value={weightGoalKg} onChangeText={setWeightGoalKg} />
          <View style={s.bmiRow}>
            <LinearGradient colors={[C.blush, C.roseLight]} style={s.bmiBox}>
              <Text style={s.bmiNum}>{bmi}</Text>
              <Text style={s.bmiLbl}>BMI</Text>
            </LinearGradient>
            {bmiCategory ? (
              <LinearGradient colors={bmiGradient} style={s.bmiCatBox}>
                <Text style={s.bmiCat}>{bmiCategory}</Text>
              </LinearGradient>
            ) : null}
          </View>
          <TouchableOpacity style={s.primaryBtn} onPress={handleSave}>
            <LinearGradient colors={[C.rose, C.roseDark]} style={s.primaryBtnInner}>
              <Text style={s.primaryBtnText}>Save Changes ✓</Text>
            </LinearGradient>
          </TouchableOpacity>
        </AccordionCard>

        {/* ── Data Sharing ── */}
        <View style={s.card}>
          <LinearGradient colors={[C.mint, "#B8EAD8"]} style={s.cardHeader}>
            <View style={s.cardHeaderLeft}>
              <Text style={s.cardTitle}>Data Sharing</Text>
            </View>
          </LinearGradient>
          <View style={s.cardBody}>
            <Text style={s.mutedText}>Allow providers to view your health data.</Text>
            <View style={s.toggleRow}>
              {(["YES", "NO"] as const).map((v) => {
                const active = dataSharing === (v === "YES");
                return (
                  <TouchableOpacity key={v} onPress={() => setDataSharing(v === "YES")}
                    style={[s.togglePill, active && s.togglePillActive]}>
                    <Text style={[s.togglePillText, active && s.togglePillTextActive]}>
                      {v === "YES" ? "✓  Yes" : "✗  No"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Health Reports ── */}
        <AccordionCard title="Health Reports" emoji=""
          gradient={[C.lavender, "#E8C9F5"]}
          open={openReports} onToggle={() => setOpenReports((p) => !p)}>
          <View style={s.rangeRow}>
            {(["WEEKLY", "MONTHLY", "YEARLY"] as const).map((t) => (
              <TouchableOpacity key={t} onPress={() => setReportRange(t)}
                style={[s.rangePill, reportRange === t && s.rangePillActive]}>
                <Text style={[s.rangePillText, reportRange === t && s.rangePillTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.subHeading}>Steps & Calories</Text>
          <View style={s.bubblesGrid}>
            <Bubble label="Steps Total"  value={stepsTotal}     gradient={[C.mint,     "#B8EAD8"]} />
            <Bubble label="Avg / Day"    value={stepsAvg}       gradient={[C.peach,    "#FAD5B8"]} />
            <Bubble label="Cal Intake"   value={calIntakeTotal} gradient={[C.blush,    C.roseLight]} />
            <Bubble label="Cal Burned"   value={calBurnedTotal} gradient={[C.lavender, "#E8C9F5"]} />
          </View>

          <Text style={s.subHeading}>Cycle Summary</Text>
          <ReportRow label="Avg Period Length" value={avgLength != null ? `${avgLength} days` : "--"} />
          <ReportRow label="Cycle Length"      value={avgCycle  != null ? `${avgCycle} days`  : "--"} />
          <ReportRow label="Next Period"       value={nextPeriodDate ? nextPeriodDate.toDateString() : "--"} />
          <ReportRow label="Ovulation"         value={ovulationDate  ? ovulationDate.toDateString()  : "--"} />
          <ReportRow label="Fertile Window"    value={fertileStart && fertileEnd ? `${fertileStart.toLocaleDateString("en-US",{month:"short",day:"numeric"})} – ${fertileEnd.toLocaleDateString("en-US",{month:"short",day:"numeric"})}` : "--"} />
          <ReportRow label="Cycle Range"       value={cycleRange ? `${cycleRange.early.toLocaleDateString("en-US",{month:"short",day:"numeric"})} – ${cycleRange.late.toLocaleDateString("en-US",{month:"short",day:"numeric"})}` : "--"} />

          <Text style={[s.subHeading, { marginTop: 14 }]}>PCOS Summary</Text>
          <ReportRow label="PCOS Entries" value={`${pcosCount} days`} />

          <TouchableOpacity style={s.primaryBtn} onPress={exportPdf}>
            <LinearGradient colors={[C.lavDark, "#8A55A8"]} style={s.primaryBtnInner}>
              <Ionicons name="document-text-outline" size={16} color={C.white} />
              <Text style={s.primaryBtnText}>Export PDF</Text>
            </LinearGradient>
          </TouchableOpacity>
        </AccordionCard>

        {/* ── Share with Providers ── */}
        <TouchableOpacity style={s.primaryBtn} onPress={onShareReport}>
          <LinearGradient colors={[C.rose, C.roseDark]} style={s.primaryBtnInner}>
            <Ionicons name="share-social-outline" size={17} color={C.white} />
            <Text style={s.primaryBtnText}>Share with Providers</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Linked Healthcare Providers ── */}
        <View style={[s.card, { marginTop: 14 }]}>
          <LinearGradient colors={["#FDE8ED", "#FAD5DC"]} style={s.cardHeader}>
            <View style={s.cardHeaderLeft}>
              <Text style={s.cardTitle}>Linked Providers</Text>
            </View>
          </LinearGradient>
          <View style={s.cardBody}>
            {providers.length === 0 && <Text style={s.mutedText}>No providers available</Text>}
            {providers.map((p) => {
              const linked = myAccess.find((a) => a.providerId === p.userId && a.status === "active");
              const name   = p.displayName || p.name || p.email || `Provider ${String(p.userId).slice(0, 6)}`;
              return (
                <View key={p.$id} style={s.providerRow}>
                  <LinearGradient
                    colors={linked ? [C.mint, "#B8EAD8"] : [C.blush, C.roseLight]}
                    style={s.providerAvatar}>
                    <Text style={s.providerAvatarText}>{name.charAt(0).toUpperCase()}</Text>
                  </LinearGradient>
                  <Text style={s.providerName}>{name}</Text>
                  <TouchableOpacity
                    onPress={async () => {
                      if (linked) await revokeAccess(p.userId);
                      else        await grantAccess(p.userId);
                      setMyAccess(await getMyProviders());
                    }}
                    style={[s.accessBtn, linked ? s.accessBtnRevoke : s.accessBtnGrant]}>
                    <Text style={[s.accessBtnText, linked ? s.accessBtnTextRevoke : s.accessBtnTextGrant]}>
                      {linked ? "Revoke" : "Grant"}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Sign Out ── */}
        <TouchableOpacity style={s.signOutBtn} onPress={signOut}>
          <Ionicons name="log-out-outline" size={18} color={C.roseDark} />
          <Text style={s.signOutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </LinearGradient>
  );
}

const C = {
  blush:     "#FADADD", roseLight: "#F9C5C9", rose:      "#E8929A",
  roseDark:  "#C45C6A", lavender:  "#EDD9F5", lavDark:   "#B07CC6",
  peach:     "#FAE5D3", peachDark: "#E8A87C", mint:      "#D4F0E8",
  mintDark:  "#6BBFA3", cream:     "#FFF8F5", white:     "#FFFFFF",
  textDark:  "#3D2030", textMid:   "#7A4F5A", textLight: "#B08090",
  border:    "#F0D5DA",
};


const s = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 },

  avatarRow:   { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 24 , marginTop:50,},
  avatar:      { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" },
  avatarEmoji: { fontSize: 26 },
  greeting:    { fontSize: 22, fontWeight: "900", color: C.textDark },
  greetingSub: { fontSize: 13, color: C.textLight, fontWeight: "600", marginTop: 2 },

  card: { backgroundColor: C.white, borderRadius: 20, marginBottom: 14, overflow: "hidden",
    shadowColor: C.rose, shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardEmoji: { fontSize: 18 },
  cardTitle: { fontSize: 15, fontWeight: "800", color: C.textDark },
  cardBody:  { padding: 16 },

  fieldWrap:  { marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: C.textLight, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 },
  fieldInput: { backgroundColor: "#FFF5F7", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14,
    fontSize: 15, color: C.textDark, borderWidth: 1.5, borderColor: C.border },

  bmiRow:    { flexDirection: "row", gap: 12, marginVertical: 14 },
  bmiBox:    { flex: 1, borderRadius: 14, padding: 14, alignItems: "center" },
  bmiNum:    { fontSize: 28, fontWeight: "900", color: C.textDark },
  bmiLbl:    { fontSize: 12, fontWeight: "700", color: C.textMid },
  bmiCatBox: { flex: 2, borderRadius: 14, padding: 14, justifyContent: "center", alignItems: "center" },
  bmiCat:    { fontSize: 16, fontWeight: "800", color: C.textDark },

  primaryBtn:      { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  primaryBtnInner: { flexDirection: "row", gap: 8, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  primaryBtnText:  { fontSize: 15, fontWeight: "800", color: C.white },

  mutedText:           { fontSize: 13, color: C.textLight, fontWeight: "600", lineHeight: 18, marginBottom: 12 },
  toggleRow:           { flexDirection: "row", gap: 12 },
  togglePill:          { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: "#FFF5F7",
    alignItems: "center", borderWidth: 1.5, borderColor: C.border },
  togglePillActive:    { backgroundColor: C.roseDark, borderColor: C.roseDark },
  togglePillText:      { fontSize: 14, fontWeight: "700", color: C.textMid },
  togglePillTextActive:{ color: C.white },

  rangeRow:            { flexDirection: "row", gap: 8, marginBottom: 16 },
  rangePill:           { flex: 1, paddingVertical: 8, borderRadius: 12, backgroundColor: "#F5EEF8",
    alignItems: "center", borderWidth: 1.5, borderColor: C.border },
  rangePillActive:     { backgroundColor: C.lavDark, borderColor: C.lavDark },
  rangePillText:       { fontSize: 12, fontWeight: "700", color: C.textMid },
  rangePillTextActive: { color: C.white },

  subHeading:  { fontSize: 13, fontWeight: "800", color: C.textDark, marginBottom: 10 },
  bubblesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  bubble:      { width: "47%", borderRadius: 14, padding: 14, alignItems: "center" },
  bubbleValue: { fontSize: 22, fontWeight: "900", color: C.textDark },
  bubbleLabel: { fontSize: 11, fontWeight: "700", color: C.textMid, marginTop: 2, textAlign: "center" },

  reportRow:      { flexDirection: "row", justifyContent: "space-between", paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: "#F5E8EC" },
  reportRowLabel: { fontSize: 13, fontWeight: "600", color: C.textMid },
  reportRowValue: { fontSize: 13, fontWeight: "800", color: C.textDark },

  providerRow:         { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "#F5E8EC" },
  providerAvatar:      { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  providerAvatarText:  { fontSize: 14, fontWeight: "800", color: C.textDark },
  providerName:        { flex: 1, fontSize: 14, fontWeight: "700", color: C.textDark },
  accessBtn:           { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, borderWidth: 1.5 },
  accessBtnGrant:      { backgroundColor: C.mint,  borderColor: C.mintDark },
  accessBtnRevoke:     { backgroundColor: C.blush, borderColor: C.roseDark },
  accessBtnText:       { fontSize: 12, fontWeight: "800" },
  accessBtnTextGrant:  { color: C.mintDark },
  accessBtnTextRevoke: { color: C.roseDark },

  signOutBtn:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    marginTop: 8, paddingVertical: 10, borderRadius: 16, backgroundColor: C.blush,
    borderWidth: 1.5, borderColor: C.roseLight },
  signOutText: { fontSize: 14, fontWeight: "700", color: C.roseDark },
});