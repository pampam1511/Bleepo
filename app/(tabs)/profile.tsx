import { useAuth } from "@/lib/auth-context";
import { Text, View, TextInput, TouchableOpacity, StyleSheet, Keyboard } from "react-native";
import { Button } from "react-native-paper";
import React, { useEffect, useState, useMemo} from "react";
import { useProfile } from "@/lib/profile-context";
import { useHealth } from "@/lib/health-context";
import { useProviderAccess } from "@/lib/provider-access-context";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";


export default function profileScreen() {
    const {signOut} = useAuth()
    const {getUserProfile, saveUserProfile} = useProfile();
    const {fetchAllLogs,getPeriodStats,getStepsDaily,getCaloriesRange} = useHealth();

    const [heightCm, setHeightCm] = useState("0");
    const [weightKg, setWeightKg] = useState("0");
    const [openPersonal, setOpenPersonal] = useState(false);
    const [weightGoalKg, setWeightGoalKg] = useState("0");

    const [reportRange, setReportRange] = useState<"WEEKLY" | "MONTHLY" | "YEARLY">("WEEKLY");
    const [stepsTotal, setStepsTotal] = useState(0);
    const [stepsAvg, setStepsAvg] = useState(0);
    const [calIntakeTotal, setCalIntakeTotal] = useState(0);
    const [calBurnedTotal, setCalBurnedTotal] = useState(0);
    const [pcosCount, setPcosCount] = useState(0);

    const [rangeLogs, setRangeLogs] = useState<any[]>([]);

    const [openReports, setOpenReports] = useState(false);

    const { listProviders, grantAccess, revokeAccess, getMyProviders } = useProviderAccess();
    const [providers, setProviders] = useState<any[]>([]);
    const [myAccess, setMyAccess] = useState<any[]>([]);
    const [dataSharing, setDataSharing] = useState(false);



    useEffect(() => {
        const load = async () => {
            const doc = await getUserProfile();
            if (doc) { 
                setHeightCm(String(doc.heightCm ?? 0));
                setWeightKg(String(doc.weightKg ?? 0));
                setWeightGoalKg(String(doc.weightGoalKg ?? 0)); 
            }
        };
        load();
    }, []);

    const bmi =
        Number(heightCm) > 0
            ?(Number(weightKg) / Math.pow(Number(heightCm) / 100, 2)).toFixed(1)
            : "--";
    
    const handleSave = async () => {
        await saveUserProfile({
            heightCm: Number(heightCm || 0),
            weightKg: Number(weightKg || 0),
            weightGoalKg: Number(weightGoalKg || 0),
            dataSharing
        });
        Keyboard.dismiss();
    };

    const getRange = () => {
        const end = new Date();
        const start = new Date();
        if (reportRange === "WEEKLY") {
            start.setDate(end.getDate() - 7);
        } else if (reportRange === "MONTHLY") {
            start.setMonth(end.getMonth() - 1);
        } else if (reportRange === "YEARLY") {
            start.setFullYear(end.getFullYear() - 1);
        } 
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    };

    useEffect(() => {
        const loadProviders = async () => {
            const all = await listProviders();
            setProviders(all);
            const access = await getMyProviders();
            setMyAccess(access);
        };
        loadProviders();
    }, []);

    useEffect(() => {   
        const loadRangeData = async () => {
            const { start, end } = getRange();

            //steps
            const stepsLogs = await getStepsDaily(start, end);
            const stepsSum = stepsLogs.reduce((s,x) => s + (x.steps ?? 0) ,0);
            setStepsAvg(stepsSum);
            setStepsAvg(stepsLogs.length ?  Math.round(stepsSum / stepsLogs.length) : 0);

            //calories
            const calLogs = await getCaloriesRange(start, end);
            const intakeSum = calLogs.reduce((s, x) => s + (x.dailyCaloriesIntake ?? 0), 0);
            const burnedSum = calLogs.reduce((s, x) => s + (x.burnedCalories ?? 0), 0);
            setCalIntakeTotal(intakeSum);
            setCalBurnedTotal(burnedSum);

            //cycle and pcos 
            const allLogs = await fetchAllLogs();
            const filtered = allLogs.filter((l) => {
                const d = new Date(l.date);
                return d >= start && d <= end;
            });
            setRangeLogs(filtered);

            const pcosDays = filtered.filter((l) => String(l.type).toUpperCase() === "PCOS").length;
            setPcosCount(pcosDays);     
        };
        loadRangeData();
    }
    , [reportRange]);

    const{
        avgLength,
        avgCycle,
        nextPeriodDate,
        ovulationDate,
        fertileStart,
        fertileEnd,
        cycleRange,
    } = useMemo(() => getPeriodStats(rangeLogs), [rangeLogs]);

    const exportPdf = async () => {
        const html = `
        <html>
        <head>
        <style>
        body {
            font-family: Arial, sans-serif;
            padding: 24px;
            color: #222;
        }
        h1 {
            color: #f06292;
            text-align: center;
            margin-bottom: 4px;
        }
        h2 {
            color: #009688;
            margin-top: 24px;
            margin-bottom: 8px;
            font-size: 16px;
        }
        .sub {
            text-align: center;
            color: #888;
            font-size: 12px;
            margin-bottom: 18px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
            font-size: 13px;
        }
        th {
            background: #f8bbd0;
            text-align: left;
            padding: 8px;
            font-size: 12px;
        }
        td {
            padding: 8px;
            border-bottom: 1px solid #eee;
        }
        .badge {
            background: #e0f2f1;
            color: #00796b;
            padding: 4px 8px;
            border-radius: 10px;
            font-size: 11px;
            display: inline-block;
        }
        .footer {
            text-align: center;
            font-size: 11px;
            color: #999;
            margin-top: 24px;
        }
        </style>
        </head>
        <body>
        <h1>Health Report</h1>
        <div class="sub">${reportRange} summary</div>

        <h2>Steps & Calories</h2>
        <table>
        <tr><th>Metric</th><th>Value</th></tr>
        <tr><td>Steps Total</td><td>${stepsTotal}</td></tr>
        <tr><td>Steps Avg / Day</td><td>${stepsAvg}</td></tr>
        <tr><td>Calories Intake Total</td><td>${calIntakeTotal}</td></tr>
        <tr><td>Calories Burned Total</td><td>${calBurnedTotal}</td></tr>
        </table>

        <h2>Cycle Summary</h2>
        <table>
        <tr><th>Metric</th><th>Value</th></tr>
        <tr><td>Avg Period Length</td><td>${avgLength ?? "--"} days</td></tr>
        <tr><td>Cycle Length</td><td>${avgCycle ?? "--"} days</td></tr>
        <tr><td>Next Period</td><td>${nextPeriodDate ? nextPeriodDate.toDateString() : "--"}</td></tr>
        <tr><td>Ovulation</td><td>${ovulationDate ? ovulationDate.toDateString() : "--"}</td></tr>
        <tr><td>Fertile Window</td><td>${
            fertileStart && fertileEnd
            ? `${fertileStart.toDateString()} - ${fertileEnd.toDateString()}`
            : "--"
        }</td></tr>
        <tr><td>Cycle Range</td><td>${
            cycleRange
            ? `${cycleRange.early.toDateString()} - ${cycleRange.late.toDateString()}`
            : "--"
        }</td></tr>
        </table>

        <h2>PCOS Summary</h2>
        <table>
        <tr><th>Metric</th><th>Value</th></tr>
        <tr><td>PCOS Entries</td><td>${pcosCount} days</td></tr>
        </table>

        <div class="footer">Generated by your health app</div>
    </body>
    </html>
`;

        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri);
        }
    };

    
    
    return (
        <View style={styles.screen}>
            

            {/* PERSONAL DETAILS */}
            <TouchableOpacity 
            style={styles.section} 
            onPress={() => setOpenPersonal((p) => !p)}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>PERSONAL DETAILS</Text>
                    <Text style={styles.arrow}>{openPersonal ? "▲" : "▼"}</Text>
                </View>
                {openPersonal && (
                    <>
                    <Text style={styles.label}>Height (cm)</Text>
                    <TextInput
                    style={styles.input}
                    keyboardType="number-pad"
                    value={heightCm}
                    onChangeText={setHeightCm}
                    />
                    
                    <Text style={styles.label}>Weight (kg)</Text>
                    <TextInput
                    style={styles.input}
                    keyboardType="number-pad"
                    value={weightKg}
                    onChangeText={setWeightKg}
                    />

                    <Text style={styles.label}>Weight Goal (kg)</Text>
                    <TextInput
                    style={styles.input}
                    keyboardType="number-pad"
                    value={weightGoalKg}
                    onChangeText={setWeightGoalKg}
                    />
                    <Text style={styles.label}>BMI</Text>
                    <Text style={styles.bmiValue}>{bmi}</Text>
                    
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                        <Text style={styles.saveText}>Save</Text>
                    </TouchableOpacity>
                    </>
                )}
                </TouchableOpacity>


                

                {/* DATA SHARING */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>DATA SHARING</Text>
                    <View style={styles.toggleRow}>
                        <TouchableOpacity onPress={() => setDataSharing(true)}>
                            <Text style={[styles.toggleText, dataSharing && styles.reportActive]}>YES</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setDataSharing(false)}>
                            <Text style={[styles.toggleText, !dataSharing && styles.reportActive]}>NO</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* REPORT */}
                <TouchableOpacity
                style={styles.section}
                onPress={() => setOpenReports((p) => !p)}
                >
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>HEALTH REPORTS</Text>
                        <Text style={styles.arrow}>{openReports ? "▲" : "▼"}</Text>
                    </View>
                    {openReports && (
                    <>
                    <View style={styles.section}>

                    <View style={styles.toggleRow}>
                        {["WEEKLY", "MONTHLY", "YEARLY"].map((t) => 
                        <TouchableOpacity 
                        key={t} 
                        style={[styles.reportPill, reportRange === t && styles.reportActive]}
                        onPress={() => setReportRange(t as any)}
                        >
                            <Text style={styles.reportText}>{t}</Text>
                        </TouchableOpacity>
                        )}
                    </View>

                    <Text style={styles.subHeader}>Steps & Calories</Text>
                    <Text style={styles.reportLine}>Steps Total: {stepsTotal}</Text>
                    <Text style={styles.reportLine}>Steps Avg/Day: {stepsAvg}</Text>
                    <Text style={styles.reportLine}>Calories Intake Total: {calIntakeTotal}</Text>
                    <Text style={styles.reportLine}>Calories Burned Total: {calBurnedTotal}</Text>

                    <Text style={styles.subHeader}>Cycle Summary</Text>
                    <Text style={styles.reportLine}>Avg Period Length: {avgLength ?? "--"} days</Text>
                    <Text style={styles.reportLine}>Cycle Length: {avgCycle ?? "--"} days</Text>
                    <Text style={styles.reportLine}>Next Period: {nextPeriodDate ? nextPeriodDate.toDateString() : "--"}</Text>
                    <Text style={styles.reportLine}>Ovulation: {ovulationDate ? ovulationDate.toDateString() : "--"}</Text>
                    <Text style={styles.reportLine}>
                        Fertile Window: {fertileStart && fertileEnd ? `${fertileStart.toDateString()} - ${fertileEnd.toDateString()}` : "--"}
                    </Text>
                    <Text style={styles.reportLine}>
                        Cycle Range: {cycleRange ? `${cycleRange.early.toDateString()} - ${cycleRange.late.toDateString()}` : "--"}
                    </Text>

                    <Text style={styles.subHeader}>PCOS Summary</Text>
                    <Text style={styles.reportLine}>PCOS Entries: {pcosCount} days</Text>
                    
                    <TouchableOpacity 
                    style={styles.reportBtn}

                    onPress={exportPdf}
                    >
                    <Text style={styles.reportBtnText}>EXPORT PDF</Text>
                    </TouchableOpacity>
                </View>

                    </>
                )}
                </TouchableOpacity>
        
                {/* LINKED HEALTHCARE PROVIDER */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>LINKED HEALTHCARE PROVIDER</Text>

                    {providers.map((p) => {
                        const linked = myAccess.find((a) => a.providerId === p.providerId && a.status === "active");
                        return (
                            <TouchableOpacity
                            key={p.$id}
                            style={styles.providerRow}
                            onPress={() => linked ? revokeAccess(p.providerId) : grantAccess(p.providerId)}
                            >
                                <Text style={styles.providerName}>{p.name}</Text>
                                <Text style={styles.providerBtn}>{linked ? "Revoke Access" : "Grant Access"}</Text>
                            </TouchableOpacity>
                        );
                    } )}

                </View>
                
                
                <Button mode="text" onPress={signOut} icon={"logout"}>Sign out</Button>
    </View>
    );

}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#fff", padding: 24 },
    title: { fontSize: 22, fontWeight: "800", marginBottom: 20 },

    section: {
        backgroundColor: "#d9d9d9",
        borderRadius: 16,
        padding: 14,
        marginBottom: 16,
    },

    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

    sectionTitle: { fontWeight: "800" },
    arrow: { fontWeight: "800", fontSize: 14 },

    label: { fontWeight: "600", marginTop: 6 },
    input: {
        backgroundColor: "#eee",
        borderRadius: 10,
        padding: 10,
        marginTop: 6,
    },

    bmiValue: { fontSize: 18, fontWeight: "800", marginTop: 6 },

    saveBtn: {
        marginTop: 10,
        padding: 10,
        borderRadius: 12,
        backgroundColor: "#c6c6c6",
    },
    saveText: { textAlign: "center", fontWeight: "700" },

    toggleRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10 },
    toggleText: { fontWeight: "700" },
    reportPill: { backgroundColor: "#cfcfcf", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
    reportActive: { borderWidth: 1, borderColor: "#000" },
    reportText: { fontWeight: "700", fontSize: 11 },

    subHeader: { fontWeight: "800", marginTop: 10 },
    reportLine: { fontWeight: "600", marginTop: 4 },

    reportBtn: { marginTop: 12,backgroundColor: "#c6c6c6",paddingVertical: 12,borderRadius: 12,alignItems: "center",}, 
    reportBtnText: {fontWeight: "800",letterSpacing: 0.5,},

    subText: { fontWeight: "600" },
    revoke: { textAlign: "center", fontWeight: "800", marginTop: 10 },

    providerRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
    providerName: { fontWeight: "700" },
    providerBtn: { fontWeight: "800" },

});