import { useAuth } from "@/lib/auth-context";
import { Text, View, TextInput, TouchableOpacity, StyleSheet, Keyboard } from "react-native";
import { Button } from "react-native-paper";
import React, { useEffect, useState, useMemo} from "react";
import { useProfile } from "@/lib/profile-context";
import { useHealth } from "@/lib/health-context";

export default function profileScreen() {
    const {signOut} = useAuth()

    const {getUserProfile, saveUserProfile} = useProfile();

    const {
        fetchAllLogs,
        getPeriodStats,
        getStepsDaily,
        getCaloriesRange,
    } = useHealth();

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
                        <Text style={styles.toggleText}>YES</Text>
                        <Text style={styles.toggleText}>NO</Text>
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

                    onPress={() => {
                        //TODO HOOK THIS UP TO PDF EXPORT LATER
                        console.log("EXPORT PDF");
                    }}
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
                    <Text style={styles.subText}>DR PAM - ACCESS UNTIL 15/NOV/2025</Text>
                </View>
                <Text style={styles.revoke}>REVOKE ACCESS</Text>
                
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

    reportBtn: {
        marginTop: 12,
        backgroundColor: "#c6c6c6",
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: "center",
    },
    
    reportBtnText: {
        fontWeight: "800",
        letterSpacing: 0.5,
    },

    subText: { fontWeight: "600" },
    revoke: { textAlign: "center", fontWeight: "800", marginTop: 10 },
});