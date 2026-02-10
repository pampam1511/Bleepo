import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
//rimport { BarCodeScanner } from "expo-barcode-scanner";

type FilterKey = "lowGlycaemic" | "halal" | "glutenFree";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "lowGlycaemic", label: "Low-glycaemic" },
  { key: "halal", label: "Halal" },
  { key: "glutenFree", label: "Gluten Free" },
];

export default function RecipeScreen() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<FilterKey, boolean>>({
    lowGlycaemic: false,
    halal: false,
    glutenFree: false,
  });

  const [scanVisible, setScanVisible] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);

  // Request camera permission once
  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const toggleFilter = (key: FilterKey) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // TODO: replace with Appwrite data
  const recipes = useMemo(() => {
    return [
      { id: "1", title: "Oatmeal", time: "10 mins", tags: ["Low-glycaemic"] },
      { id: "2", title: "Chickpea Salad", time: "15 mins", tags: ["High-Fiber"] },
      { id: "3", title: "Spinach Scramble", time: "8 mins", tags: ["Support Insulin System"] },
    ];
  }, []);

  // Local filter demo (replace with Appwrite query)
  const filteredRecipes = recipes.filter((r) => {
    const q = query.trim().toLowerCase();
    const matchesSearch = q.length === 0 || r.title.toLowerCase().includes(q);

    const activeKeys = Object.keys(filters).filter((k) => filters[k as FilterKey]) as FilterKey[];
    if (activeKeys.length === 0) return matchesSearch;

    // map filters to tags (placeholder logic)
    const matchesFilters = activeKeys.every((k) => {
      if (k === "lowGlycaemic") return r.tags.includes("Low-glycaemic");
      if (k === "halal") return r.tags.includes("Halal");
      if (k === "glutenFree") return r.tags.includes("Gluten Free");
      return true;
    });

    return matchesSearch && matchesFilters;
  });

  const onBarCodeScanned = ({ data }: { data: string }) => {
    setScannedCode(data);
    setScanVisible(false);
    // TODO: use `data` to query Appwrite by barcode/UPC field
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RECIPE</Text>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder=""
          value={query}
          onChangeText={setQuery}
        />
        <Ionicons name="search" size={18} color="#111" style={styles.searchIcon} />
      </View>

      {/* Scan */}
      <TouchableOpacity style={styles.scanRow} onPress={() => setScanVisible(true)}>
        <Text style={styles.scanText}>Scan Barcode</Text>
        <Ionicons name="scan" size={20} color="#111" />
      </TouchableOpacity>

      {/* Filters */}
      <Text style={styles.filterTitle}>Filter</Text>
      <View style={styles.filterGrid}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={styles.filterItem}
            onPress={() => toggleFilter(f.key)}
          >
            <View style={[styles.checkbox, filters[f.key] && styles.checkboxActive]} />
            <Text style={styles.filterText}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <View style={styles.card}>
        <FlatList
          data={filteredRecipes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.recipeRow}>
              <View style={styles.thumb} />
              <View style={styles.recipeText}>
                <Text style={styles.recipeTitle}>{item.title}</Text>
                <View style={styles.pill}><Text style={styles.pillText}>{item.time}</Text></View>
                {item.tags.map((t) => (
                  <View key={t} style={styles.pill}><Text style={styles.pillText}>{t}</Text></View>
                ))}
              </View>
            </View>
          )}
        />
      </View>

      {/* Barcode Modal */}
      <Modal visible={scanVisible} animationType="slide">
        <View style={styles.scanContainer}>
          <Text style={styles.scanHeader}>Scan a barcode</Text>

          {hasPermission === false && (
            <Text style={styles.scanError}>Camera permission not granted</Text>
          )}

          {hasPermission && (
            <BarCodeScanner
              onBarCodeScanned={onBarCodeScanned}
              style={styles.scanner}
            />
          )}

          {scannedCode && (
            <Text style={styles.scanResult}>Scanned: {scannedCode}</Text>
          )}

          <TouchableOpacity onPress={() => setScanVisible(false)} style={styles.scanClose}>
            <Text>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 24 },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 16 },

  searchRow: { position: "relative", marginBottom: 8 },
  searchInput: {
    backgroundColor: "#d9d9d9",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  searchIcon: { position: "absolute", right: 12, top: 10 },

  scanRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 12 },
  scanText: { fontWeight: "600" },

  filterTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  filterGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  filterItem: { flexDirection: "row", alignItems: "center", gap: 6, width: "45%" },
  checkbox: { width: 12, height: 12, borderRadius: 2, borderWidth: 1, borderColor: "#444" },
  checkboxActive: { backgroundColor: "#444" },
  filterText: { fontWeight: "600" },

  card: { backgroundColor: "#d9d9d9", borderRadius: 16, padding: 16, flex: 1 },
  recipeRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  thumb: { width: 50, height: 50, borderRadius: 12, backgroundColor: "#c6c6c6" },
  recipeText: { flex: 1 },
  recipeTitle: { fontWeight: "700", marginBottom: 6 },

  pill: { alignSelf: "flex-start", backgroundColor: "#bfbfbf", borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10, marginBottom: 6 },
  pillText: { fontSize: 12, fontWeight: "600" },

  scanContainer: { flex: 1, padding: 20, backgroundColor: "#fff" },
  scanHeader: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  scanner: { flex: 1 },
  scanError: { color: "red" },
  scanResult: { marginTop: 12, fontWeight: "600" },
  scanClose: { marginTop: 16, alignSelf: "center" },
});
