import { useAuth } from "@/lib/auth-context";
import { Text, View, TextInput, TouchableOpacity, StyleSheet, Keyboard } from "react-native";
import { Button } from "react-native-paper";
import React, { useEffect, useState} from "react";
import { useProfile } from "@/lib/profile-context";

export default function profileScreen() {
    const {signOut} = useAuth()

    const {getUserProfile, saveUserProfile} = useProfile();

    const [heightCm, setHeightCm] = useState("0");
    const [weightKg, setWeightKg] = useState("0");
    const [openPersonal, setOpenPersonal] = useState(false);

    const [weightGoalKg, setWeightGoalKg] = useState("0");

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

    subText: { fontWeight: "600" },
    revoke: { textAlign: "center", fontWeight: "800", marginTop: 10 },
});