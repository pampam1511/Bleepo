import React, { useMemo, useState, useEffect } from "react";
import { Text, View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { TextInput } from "react-native-paper";
import { useHealth } from "@/lib/health-context";

const WEEK_DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MOOD_OPTIONS = ["😢", "😕", "😐", "🙂", "😄"];
const PAIN_LEVELS = [1, 2, 3, 4, 5];
const BLEEDING_OPTIONS = ["none", "spotting", "light", "medium", "heavy"] as const; 
const ACNE_LEVELS = ["mild", "moderate", "severe"] as const;
const SYMPTOM_OPTIONS = ["cramps", "headache", "fatigue", "nausea", "bloating"] as const;




function buildMonth(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
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

export default function CalendarScreen() {
  const { fetchMonthLogs, fetchAllLogs, getDetailLog, saveHealthLog, getPeriodStats } = useHealth();

  const [date, setDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [activeMode, setActiveMode] = useState<"PERIOD" | "PCOS" | null>(null);

  const [logs, setLogs] = useState<any[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]);

  const [moods, setMoods] = useState<string[]>([]);
  const [painLevel, setPainLevel] = useState(3);
  const [bleeding, setBleeding] =
    useState<"none" | "spotting" | "light" | "medium" | "heavy">("none");

  const [padChanges, setPadChanges] = useState(0);
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  const [bloating, setBloating] = useState(3);
  const [facialHair, setFacialHair] = useState<"YES" | "NO">("NO");
  const [stressLevel, setStressLevel] = useState(3);

  const [periodStart, setPeriodStart] = useState<Date | null>(null);
  const [periodEnd, setPeriodEnd] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [acne_levels, setAcneLevel] = useState<"none" | "mild" | "moderate" | "severe">("mild");
  const [fatigue, setFatigue] = useState(3);
  const [increasedAppetite, setIncreasedAppetite] = useState(3);

  const [periodSymptoms, setPeriodSymptoms] = useState<string[]>([]);

  const monthLabel = date.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const cells = useMemo(
    () => buildMonth(date.getFullYear(), date.getMonth()),
    [date]
  );

  const selectedDateLocal =
    selectedDay !== null
      ? new Date(date.getFullYear(), date.getMonth(), selectedDay).toISOString()
      : null;

  useEffect(() => {
    const loadAll = async () => {
      const all = await fetchAllLogs();
      setAllLogs(all);
    };
    loadAll();
  }, []);

  useEffect(() => {
    const load = async () => {
      const monthLogs = await fetchMonthLogs(date);
      setLogs(monthLogs);
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
      }
    };

    loadDetails();
  }, [selectedLog, activeMode]);

  const handleSave = async () => {
    if (!selectedDateLocal || !activeMode) return;

    let safeStart = periodStart;
    let safeEnd = periodEnd;
    if (activeMode === "PERIOD") {
      if(!safeStart && selectedDay !== null) {
        safeStart = new Date(date.getFullYear(), date.getMonth(), selectedDay);
      } if (!safeEnd && selectedDay) {
        safeEnd = safeStart;
      }
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
              endDate: safeEnd ? safeEnd.toISOString() : null,
            }
          : {
              painLevel,
              moods,
              bloating,
              facialhair: facialHair === "YES",
              stressLevel,
              acne_levels: acne_levels,
              fatigue,
              increased_appetite: increasedAppetite,
            },
    });

    const updated = await fetchMonthLogs(date);
    setLogs(updated);

    const all = await fetchAllLogs();
    setAllLogs(all);

    setSelectedDay(null);
    setActiveMode(null);
  };

  const handleCancel = () => {
    setSelectedDay(null);
    setActiveMode(null);
  };

  const { 
    avgLength, 
    avgCycle,
    nextPeriodDate,
    ovulationDate,
    fertileStart,
    fertileEnd,
    cycleRange,
  } = useMemo(
    () => getPeriodStats(allLogs),
    [allLogs]
  );

  const nextPeriodDays =
    nextPeriodDate ? Math.round((nextPeriodDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <View style={styles.screen}>
      

      <View style={styles.monthRow}>
        <TouchableOpacity
          onPress={() =>
            setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1))
          }
        >
          <Text style={styles.arrow}>{"<"}</Text>
        </TouchableOpacity>

        <Text style={styles.monthText}>{monthLabel}</Text>

        <TouchableOpacity
          onPress={() =>
            setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1))
          }
        >
          <Text style={styles.arrow}>{">"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.weekRow}>
          {WEEK_DAYS.map((d) => (
            <Text key={d} style={styles.weekDay}>{d}</Text>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {cells.map((d, i) => (
            <TouchableOpacity
              key={i}
              disabled={!d}
              onPress={() => {
                if (!d) return;
                console.log("pressed", d);
                setSelectedDay(d);
                setActiveMode(null);
              }}
              style={[
                styles.dayBox,
                d && isInRange(d, periodStart, periodEnd, date.getFullYear(), date.getMonth())
                  ? styles.dayRangeBox
                  : undefined,
              ]}
              
            >
              <Text style={styles.day}>{d ?? ""}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.cardArea}>
        <ScrollView style={styles.cardScroll} contentContainerStyle={styles.cardContent}>
          {selectedDay === null && (
            <View style={styles.cycleCard}>
              <Text style={styles.sectionTitle}>ABOUT YOUR CYCLE</Text>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>NEXT PERIOD</Text>
                  <Text style={styles.statValue}>{nextPeriodDays ?? "--"}</Text>
                  <Text style={styles.statUnit}>DAYS</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>AVERAGE PERIOD</Text>
                  <Text style={styles.statValue}>{avgLength ?? "--"}</Text>
                  <Text style={styles.statUnit}>DAYS</Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>CYCLE LENGTH</Text>
                  <Text style={styles.statValue}>{avgCycle ?? "--"}</Text>
                  <Text style={styles.statUnit}>DAYS</Text>
                </View>
                
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>OVULATION</Text>
                  <Text style={styles.statValuE}>
                    {ovulationDate ? ovulationDate.toDateString() : "--"}
                  </Text>
              </View>
            </View>

              
              <View style={styles.statsRow}>
                <View style={[styles.statBox, ]}>
                  <Text style={styles.statLabel}>FERTILE WINDOW</Text>
                  <Text style={styles.statValuE}>
                    {fertileStart && fertileEnd
                    ? `${fertileStart.toDateString()} - ${fertileEnd.toDateString()}`
                    : "--"}
                  </Text>
                </View>

                
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>CYCLE RANGE</Text>
                    <Text style={styles.statValuE}>
                      {cycleRange 
                      ? `${cycleRange.early.toDateString()} - ${cycleRange.late.toDateString()}` 
                      : "--"}
                    </Text>
              
                </View>


              </View>



            </View>
          )}

          {selectedDay !== null && (
            <View style={styles.filters}>
              {["PERIOD", "PCOS"].map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.pill,
                    activeMode === mode && styles.activePill,
                  ]}
                  onPress={() => setActiveMode(mode as "PERIOD" | "PCOS")}
                >
                  <Text style={styles.pillText}>{mode}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {selectedDay !== null && activeMode === "PERIOD" && (
            <View style={styles.cycleCard}>
              <Text style={styles.sectionTitle}>Menstrual cycle</Text>

              <TouchableOpacity onPress={() => setShowStartPicker(true)}>
                <Text style={styles.label}>Start Date</Text>
                <Text style={styles.dateText}>
                  {periodStart ? periodStart.toDateString() : "Select start date"}
                </Text>
              </TouchableOpacity>
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

              <TouchableOpacity onPress={() => setShowEndPicker(true)}>
                <Text style={styles.label}>End Date</Text>
                <Text style={styles.dateText}>
                  {periodEnd ? periodEnd.toDateString() : "Select end date"}
                </Text>
              </TouchableOpacity>
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

              <Text style={styles.label}>Flow Intensity</Text>
              <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={{ paddingVertical: 6 }}>
              
                {BLEEDING_OPTIONS.map((b, i) => (
                  <TouchableOpacity
                    key={b}
                    style={[
                      styles.bleedingPill,
                      bleeding === b && styles.bleedingSelected,
                      i !== BLEEDING_OPTIONS.length - 1 && { marginRight: 8 },
                    ]}
                    onPress={() => setBleeding(b)
                    }
                  >
                    <Text>{b}</Text>
                  </TouchableOpacity>
                ))}
                </ScrollView>

              <Text style={styles.label}>Pain Level</Text>
              <View style={styles.sliderRow}>
                {PAIN_LEVELS.map((lvl)=> (
                  <TouchableOpacity
                    key={lvl}
                    style={[
                      styles.sliderDot,
                      painLevel >= lvl && styles.sliderActive,
                    ]}
                    onPress={() => setPainLevel(lvl)}
                  />
                ))}
              </View>

              <Text style={styles.label}>Symptoms</Text>
              <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={{ paddingVertical: 6 }}
              >
                {SYMPTOM_OPTIONS.map((s,i) => (
                <TouchableOpacity 
                key={s} 
                style={[ 
                  styles.bleedingPill, 
                  periodSymptoms.includes(s) && styles.bleedingSelected,
                  i !== SYMPTOM_OPTIONS.length - 1 && { marginRight: 8 }, 
                ]} 
                onPress={() => 
                  setPeriodSymptoms((prev) => 
                  prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s] 
                  )
                } 
                > 
                <Text>{s}</Text> 
                </TouchableOpacity>
              ))}
              </ScrollView>

              <Text style={styles.label}>Mood</Text>
              <View style={styles.moodRow}>
                {MOOD_OPTIONS.map((m) =>(
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.moodCircle,
                      moods.includes(m) && styles.moodSelected,
                    ]}
                    onPress={() =>
                      setMoods((prev) =>
                      prev.includes(m)
                        ? prev.filter((x) => x !== m)
                        : [...prev, m]
                      )
                    }
                    >
                      <Text>{m}</Text>
                    </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Pad / Tampon Changes</Text>
              <View style={styles.sliderRow}>
                {[0,1,2,3,4,5].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[
                    styles.sliderDot,
                    padChanges >= n && styles.sliderActive,
                  ]}
                  onPress={() => setPadChanges(n)}
                />
                ))}
              </View>

              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Write notes..."
                multiline
              />

              <View style={styles.addPhotoRow}>
                <Text style={styles.addPhotoText}>+ Add Photos</Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity onPress={handleCancel}>
                  <Text>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave}>
                  <Text>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {selectedDay !== null && activeMode === "PCOS" && (
            <View style={styles.cycleCard}>
              <Text style={styles.sectionTitle}>PCOS Symptoms</Text>

              <Text style={styles.label}>Pain Level</Text>
              <View style={styles.sliderRow}>
                {PAIN_LEVELS.map((lvl) => (
                  <TouchableOpacity
                    key={lvl}
                    style={[
                      styles.sliderDot,
                      painLevel >= lvl && styles.sliderActive,
                    ]}
                    onPress={() => setPainLevel(lvl)}
                  />
                ))}
              </View>

              <Text style={styles.label}>Mood</Text>
              <View style={styles.moodRow}>
                {MOOD_OPTIONS.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.moodCircle,
                      moods.includes(m) && styles.moodSelected,
                    ]}
                    onPress={() =>
                      setMoods((prev) =>
                        prev.includes(m)
                          ? prev.filter((x) => x !== m)
                          : [...prev, m]
                      )
                    }
                  >
                    <Text>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Acne Level</Text>
              <View style={styles.bleedingRow}>
                {ACNE_LEVELS.map((lvl) => (
                  <TouchableOpacity
                    key={lvl}
                    style={[
                      styles.bleedingPill,
                      acne_levels === lvl && styles.bleedingSelected,
                    ]}
                    onPress={() => setAcneLevel(lvl)}
                  >
                    <Text>{lvl}</Text>
                  </TouchableOpacity>
                ))}

              </View>

              <Text style={styles.label}>Fatigue</Text>
              <View style={styles.sliderRow}>
                {[1,2,3,4,5].map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[
                      styles.sliderDot,
                      fatigue >= n && styles.sliderActive,
                    ]}
                    onPress={() => setFatigue(n)}
                  />
                ))}
              </View>

              <Text style={styles.label}>Increased Appetite</Text>
              <View style={styles.sliderRow}>
                {[1,2,3,4,5].map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[
                      styles.sliderDot,
                      increasedAppetite >= n && styles.sliderActive,
                    ]}
                    onPress={() => setIncreasedAppetite(n)}
                  />
                ))}
              </View>


              <Text style={styles.label}>Bloating</Text>
              <View style={styles.sliderRow}>
                {[1,2,3,4,5].map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[
                      styles.sliderDot,
                      bloating >= n && styles.sliderActive,
                    ]}
                    onPress={() => setBloating(n)}
                  />
                ))}
              </View>

              <Text style={styles.label}>Facial Hair</Text>
              <View style={styles.bleedingRow}>
                {["YES","NO"].map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[
                      styles.bleedingPill,
                      facialHair === v && styles.bleedingSelected,
                    ]}
                    onPress={() => setFacialHair(v as "YES" | "NO")}
                  >
                    <Text>{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Stress Level</Text>
              <View style={styles.sliderRow}>
                {[1,2,3,4,5].map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[
                      styles.sliderDot,
                      stressLevel >= n && styles.sliderActive,
                    ]}
                    onPress={() => setStressLevel(n)}
                  />
                ))}
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity onPress={handleCancel}>
                  <Text>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave}>
                  <Text>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff", padding: 20 },
  title: { fontSize: 20, fontWeight: "800", textAlign: "center", marginBottom: 8 },
  monthRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  monthText: { fontSize: 16, fontWeight: "600" },
  arrow: { fontSize: 18 },

  calendarCard: { backgroundColor: "#FFE6EA", padding: 16, borderRadius: 16, borderWidth: 2, borderColor: "#b2d8d8" },
  weekRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  weekDay: { fontWeight: "700", fontSize: 12 },
  daysGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  dayBox: { width: "14%", alignItems: "center", marginVertical: 6 },
  day: { fontWeight: "600" },
  dayRangeBox: { backgroundColor: "#cfe7ff", borderRadius: 8 },

  cardArea: { flex: 1, marginTop: 12 },
  cardScroll: { flex: 1 },
  cardContent: { paddingBottom: 40 },

  filters: { flexDirection: "row", justifyContent: "space-around", marginVertical: 20 },
  pill: { padding: 10, borderRadius: 20, backgroundColor: "#008080" },
  activePill: { backgroundColor: "#FFE6EA" },
  pillText: { fontWeight: "700" },

  cycleCard: { backgroundColor: "#008080", padding: 16, borderRadius: 16, marginBottom: 20, borderColor: "#b2d8d8" },
  sectionTitle: { fontWeight: "700", marginBottom: 12 },

  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  statBox: { backgroundColor: "#FFE6EA", borderRadius: 12, padding: 16, width: "48%", alignItems: "center" },
  statLabel: { fontSize: 12, fontWeight: "700" },
  statValue: { fontSize: 36, fontWeight: "900" },
  statValuE: { fontSize: 20, fontWeight: "800" },  
  statUnit: { fontWeight: "700" },

  label: { fontWeight: "600", marginTop: 6 },
  dateText: { fontWeight: "600", marginBottom: 6 },

  sliderRow: { flexDirection: "row", gap: 6, marginVertical: 6 },
  sliderDot: { width: 30, height: 8, backgroundColor: "#FFC0CB", borderRadius: 4 },
  sliderActive: { backgroundColor: "#AA336A" },

  moodRow: { flexDirection: "row", gap: 10, marginVertical: 8 },
  moodCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFE6EA", alignItems: "center", justifyContent: "center" },
  moodSelected: { backgroundColor: "#AA336A" },

  bleedingRow: { flexDirection: "row", gap: 8, marginVertical: 6 },
  bleedingPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "#FFE6EA" },
  bleedingSelected: { backgroundColor: "#AA336A" },

  notesInput: {
    backgroundColor: "#FFE6EA",
    borderRadius: 10,
    padding: 10,
    minHeight: 60,
    marginTop: 6,
    textAlignVertical: "top",
  },

  addPhotoRow: { marginTop: 8, alignItems: "flex-start" },
  addPhotoText: { fontWeight: "600" },

  actionRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  
});
