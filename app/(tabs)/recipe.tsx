import { account, databases } from "@/lib/appwrite";
import { useHealth } from "@/lib/health /health-context";
import { Ionicons } from "@expo/vector-icons";
import { Camera, CameraView } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ID, Permission, Query, Role } from "react-native-appwrite";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

type FilterKey = "halal" | "chicken" | "beef" | "fish" | "vegan" | "vegetarian";

const FILTERS: { key: FilterKey; label: string; emoji: string }[] = [
  { key: "halal",       label: "Halal",       emoji: "☪️" },
  { key: "chicken",     label: "Chicken",     emoji: "🍗" },
  { key: "beef",        label: "Beef",        emoji: "🥩" },
  { key: "fish",        label: "Fish",        emoji: "🐟" },
  { key: "vegan",       label: "Vegan",       emoji: "🌱" },
  { key: "vegetarian",  label: "Vegetarian",  emoji: "🥦" },
];

const DB_ID = "697ceba5002b026d89f2";
const RECIPE_FAVORITES = "recipe_favorites";

export default function RecipeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { saveTodayCalories, getTodayCalories, saveTodayNutrition, getTodayNutrition } = useHealth();

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<FilterKey, boolean>>({
    halal: false, chicken: false, beef: false,
    fish: false,  vegan: false,  vegetarian: false,
  });

  const [scanVisible,   setScanVisible]   = useState(false);
  const [manualVisible, setManualVisible] = useState(false);
  const [manualFood, setManualFood] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "" });

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning,    setIsScanning]    = useState(true);
  const [loading,       setLoading]       = useState(false);
  const [scanResult,    setScanResult]    = useState<any | null>(null);

  const [recipes,    setRecipes]    = useState<any[]>([]);
  const [favorites,  setFavorites]  = useState<any[]>([]);
  const [favLoading, setFavLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const loadFavorites = async () => {
    setFavLoading(true);
    try {
      const user = await account.get();
      const res = await databases.listDocuments(DB_ID, RECIPE_FAVORITES, [
        Query.equal("userId", user.$id),
        Query.orderDesc("$createdAt"),
      ]);
      setFavorites(res.documents);
    } finally {
      setFavLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadFavorites(); }, []));

  const fetchRecipes = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`);
      const json = await res.json();
      if (json?.meals) {
        setRecipes(json.meals.map((m: any, idx: number) => ({
          id: String(m.idMeal),
          listKey: `meal-${m.idMeal}-${idx}`,
          title: m.strMeal,
          image: m.strMealThumb ?? "",
          time: "30 mins",
          tags: [],
          instructions: m.strInstructions,
          ingredients: Array.from({ length: 20 })
            .map((_, i) => {
              const ing = m[`strIngredient${i + 1}`];
              const meas = m[`strMeasure${i + 1}`];
              return ing ? `${meas ?? ""} ${ing}`.trim() : null;
            })
            .filter(Boolean),
        })));
      } else {
        setRecipes([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const onBarCodeScanned = async ({ data }: { data: string }) => {
    if (!isScanning) return;
    setIsScanning(false);
    try {
      const res = await fetch(
        `https://world.openfoodfacts.net/api/v2/product/${data}?fields=product_name,nutriments`,
        { headers: { "User-Agent": "Pimpo/1.0 (you@example.com)" } }
      );
      const json = await res.json();
      if (json?.product) {
        const n = json.product.nutriments || {};
        const item = {
          id: String(data), listKey: `scan-${data}-${Date.now()}`,
          title: json.product.product_name ?? "Unknown product",
          image: "", time: "Manual", tags: ["Scanned"],
          nutrition: { calories: n["energy-kcal_100g"] ?? 0, protein: n["proteins_100g"] ?? 0, carbs: n["carbohydrates_100g"] ?? 0, fat: n["fat_100g"] ?? 0 },
        };
        setScanResult(item.nutrition);
        setRecipes((prev) => [item, ...prev]);
        await saveFoodToDailyLogs(item.nutrition);
      } else {
        setScanResult({ name: "Not found" });
      }
    } catch {
      setScanResult({ name: "Error fetching data" });
    }
  };

  const addManualFood = async () => {
    const item = {
      id: Date.now().toString(), listKey: `manual-${Date.now()}-${Math.random()}`,
      title: manualFood.name || "Manual Food", image: "", time: "Manual", tags: ["Manual"],
      nutrition: { calories: Number(manualFood.calories) || 0, protein: Number(manualFood.protein) || 0, carbs: Number(manualFood.carbs) || 0, fat: Number(manualFood.fat) || 0 },
    };
    setRecipes((prev) => [item, ...prev]);
    await saveFoodToDailyLogs(item.nutrition);
    setManualVisible(false);
    setManualFood({ name: "", calories: "", protein: "", carbs: "", fat: "" });
  };

  const saveFavorite = async (item: any) => {
    try {
      const user = await account.get();
      const existing = await databases.listDocuments(DB_ID, RECIPE_FAVORITES, [
        Query.equal("userId", user.$id),
        Query.equal("recipeId", String(item.id)),
      ]);
      if (existing.documents.length > 0) return;
      await databases.createDocument(DB_ID, RECIPE_FAVORITES, ID.unique(),
        { userId: user.$id, recipeId: String(item.id), title: item.title, image: item.image ?? "", savedAt: new Date().toISOString() },
        [Permission.read(Role.user(user.$id)), Permission.update(Role.user(user.$id)), Permission.delete(Role.user(user.$id))]
      );
      await loadFavorites();
    } catch (e: any) {
      console.log("saveFavorite error:", e?.message);
    }
  };

  const toggleFilter = (key: FilterKey) => setFilters((prev) => ({ ...prev, [key]: !prev[key] }));

  const filteredRecipes = useMemo(() => {
    const q = query.trim().toLowerCase();
    const activeKeys = Object.keys(filters).filter((k) => filters[k as FilterKey]) as FilterKey[];
    return recipes.filter((r) => {
      if (q.length > 0 && !r.title.toLowerCase().includes(q)) return false;
      if (activeKeys.length === 0) return true;
      return activeKeys.every((k) => {
        if (k === "halal") return r.tags?.includes("Halal");
        return r.title?.toLowerCase().includes(k);
      });
    });
  }, [recipes, query, filters]);

  const saveFoodToDailyLogs = async (food: { calories: number; protein: number; carbs: number; fat: number }) => {
    const calDoc = await getTodayCalories();
    const nDoc   = await getTodayNutrition();
    await saveTodayCalories({
      targetCalories: Number(calDoc?.targetCalories ?? 0),
      dailyCalories:  Number(calDoc?.dailyCaloriesIntake ?? 0) + Number(food.calories || 0),
      burnedCalories: Number(calDoc?.burnedCalories ?? 0),
      burnedGoal:     Number(calDoc?.burnedGoal ?? 0),
      burnedSource: "manual", goalStatus: "active",
    });
    await saveTodayNutrition({
      carbs:   Number(nDoc?.carbs ?? 0)   + Number(food.carbs || 0),
      fat:     Number(nDoc?.fat ?? 0)     + Number(food.fat || 0),
      protein: Number(nDoc?.protein ?? 0) + Number(food.protein || 0),
    });
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <LinearGradient colors={[C.cream, "#FFF0F3", C.cream]} style={styles.screen}>
      <FlatList
        data={filteredRecipes}
        keyExtractor={(item, index) => item.listKey ?? `${item.id}-${index}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}

        ListHeaderComponent={
          <>
            {/* ── Title ── */}
            <Text style={styles.title}>Recipes</Text>

            {/* ── Search Bar ── */}
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Search recipes..."
                placeholderTextColor={C.textLight}
                onSubmitEditing={fetchRecipes}
                returnKeyType="search"
              />
              <TouchableOpacity onPress={fetchRecipes} style={styles.searchBtn}>
                <LinearGradient colors={[C.rose, C.roseDark]} style={styles.searchBtnGradient}>
                  <Ionicons name="search" size={18} color={C.white} />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* ── Action Buttons ── */}
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={() => setScanVisible(true)} style={styles.actionBtn}>
                <LinearGradient colors={["#fbeadb", "#f4d1bd"]} style={styles.actionBtnInner}>
                  <Ionicons name="scan" size={18} color={C.peachDark} />
                  <Text style={[styles.actionBtnText, { color: C.peachDark }]}>Scan Barcode</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setManualVisible(true)} style={styles.actionBtn}>
                <LinearGradient colors={[C.mint, "#B8EAD8"]} style={styles.actionBtnInner}>
                  <Ionicons name="add-circle-outline" size={18} color={C.mintDark} />
                  <Text style={[styles.actionBtnText, { color: C.mintDark }]}>Add Manually</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* ── Filters ── */}
            <Text style={styles.sectionHeading}>Filter by</Text>
            <View style={styles.filterGrid}>
              {FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterChip, filters[f.key] && styles.filterChipActive]}
                  onPress={() => toggleFilter(f.key)}
                >
                  <Text style={styles.filterEmoji}>{f.emoji}</Text>
                  <Text style={[styles.filterLabel, filters[f.key] && styles.filterLabelActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Search Results Header ── */}
            <Text style={styles.sectionHeading}>Search Results</Text>
            {loading && <Text style={styles.emptyText}>Finding recipes...</Text>}
            {!loading && filteredRecipes.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>🔍</Text>
                <Text style={styles.emptyText}>Search for a recipe above</Text>
              </View>
            )}
          </>
        }

        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.recipeCard}
            onPress={() => router.push({ pathname: "/(screens)/recipe /[id]", params: { id: String(item.id) } })}
            activeOpacity={0.85}
          >
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.recipeThumb} />
            ) : (
              <LinearGradient colors={[C.blush, C.roseLight]} style={styles.recipeThumb}>
                <Text style={{ fontSize: 24 }}>🍴</Text>
              </LinearGradient>
            )}
            <View style={styles.recipeInfo}>
              <Text style={styles.recipeTitle} numberOfLines={2}>{item.title}</Text>
              <View style={styles.tagRow}>
                <View style={styles.timeTag}>
                  <Ionicons name="time-outline" size={11} color={C.textLight} />
                  <Text style={styles.timeTagText}>{item.time}</Text>
                </View>
                {item.tags?.slice(0, 2).map((t: string) => (
                  <View key={t} style={styles.tag}>
                    <Text style={styles.tagText}>{t}</Text>
                  </View>
                ))}
              </View>
            </View>
            <TouchableOpacity style={styles.heartBtn} onPress={() => saveFavorite(item)}>
              <LinearGradient colors={[C.blush, C.roseLight]} style={styles.heartBtnInner}>
                <Ionicons name="heart" size={16} color={C.roseDark} />
              </LinearGradient>
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        ListFooterComponent={
          <>
            {/* ── Favourites Section ── */}
            <Text style={[styles.sectionHeading, { marginTop: 8 }]}>❤️ Favourite Recipes</Text>
            {favLoading ? (
              <Text style={styles.emptyText}>Loading...</Text>
            ) : favorites.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>💝</Text>
                <Text style={styles.emptyText}>No favourites saved yet</Text>
              </View>
            ) : (
              favorites.map((item) => (
                <TouchableOpacity
                  key={item.$id}
                  style={styles.recipeCard}
                  onPress={() => router.push({ pathname: "/(screens)/recipe /[id]", params: { id: String(item.recipeId) } })}
                  activeOpacity={0.85}
                >
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.recipeThumb} />
                  ) : (
                    <LinearGradient colors={[C.lavender, "#E8C9F5"]} style={styles.recipeThumb}>
                      <Text style={{ fontSize: 24 }}>❤️</Text>
                    </LinearGradient>
                  )}
                  <View style={styles.recipeInfo}>
                    <Text style={styles.recipeTitle} numberOfLines={2}>{item.title}</Text>
                    <View style={styles.tagRow}>
                      <View style={[styles.tag, { backgroundColor: "#F5E8FD" }]}>
                        <Text style={[styles.tagText, { color: C.lavDark }]}>Saved</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        }
      />

      {/* ── Barcode Scanner Modal ── */}
      <Modal visible={scanVisible} animationType="slide">
        <LinearGradient colors={[C.cream, "#FFF0F3"]} style={[styles.modalContainer, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.modalTitle}>📷 Scan Barcode</Text>
          <Text style={styles.modalSubtitle}>Point your camera at a product barcode</Text>

          {hasPermission === null && <Text style={styles.emptyText}>Requesting camera...</Text>}
          {hasPermission === false && <Text style={[styles.emptyText, { color: C.roseDark }]}>Camera access denied</Text>}
          {hasPermission && (
            <View style={styles.scannerWrapper}>
              <CameraView
                style={styles.scanner}
                onBarcodeScanned={onBarCodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }}
              />
              <View style={styles.scanOverlay} />
            </View>
          )}

          {scanResult && (
            <View style={styles.scanResultCard}>
              <Text style={styles.scanResultText}>
                {scanResult.name ? scanResult.name : `✓ ${scanResult.calories ?? 0} kcal logged`}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => { setScanVisible(false); setScanResult(null); setIsScanning(true); }}
          >
            <LinearGradient colors={[C.rose, C.roseDark]} style={styles.closeBtnInner}>
              <Text style={styles.closeBtnText}>Close Scanner</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </Modal>

      {/* ── Manual Entry Modal ── */}
      <Modal visible={manualVisible} animationType="slide">
        <LinearGradient colors={[C.cream, "#FFF0F3"]} style={[styles.modalContainer, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.modalTitle}>✏️ Add Food</Text>
          <Text style={styles.modalSubtitle}>Enter nutritional information manually</Text>

          {[
            { placeholder: "Food name", key: "name",     keyboard: "default"     },
            { placeholder: "Calories",  key: "calories", keyboard: "number-pad"  },
            { placeholder: "Protein (g)", key: "protein", keyboard: "number-pad" },
            { placeholder: "Carbs (g)", key: "carbs",    keyboard: "number-pad"  },
            { placeholder: "Fat (g)",   key: "fat",      keyboard: "number-pad"  },
          ].map((field) => (
            <TextInput
              key={field.key}
              style={styles.modalInput}
              placeholder={field.placeholder}
              placeholderTextColor={C.textLight}
              keyboardType={field.keyboard as any}
              value={(manualFood as any)[field.key]}
              onChangeText={(v) => setManualFood({ ...manualFood, [field.key]: v })}
            />
          ))}

          <TouchableOpacity style={styles.saveBtn} onPress={addManualFood}>
            <LinearGradient colors={[C.mintDark, "#4DA888"]} style={styles.saveBtnInner}>
              <Text style={styles.saveBtnText}>Save Food ✓</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setManualVisible(false)} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </LinearGradient>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 },

  title: { fontSize: 26, fontWeight: "900", color: C.textDark, marginBottom: 16, letterSpacing: 0.3, marginTop:60 },

  // Search
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  searchInput: {
    flex: 1, backgroundColor: C.white, borderRadius: 20,
    paddingVertical: 12, paddingHorizontal: 18,
    fontSize: 15, color: C.textDark,
    shadowColor: C.rose, shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  searchBtn: { borderRadius: 20, overflow: "hidden" },
  searchBtnGradient: { width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: 23 },

  // Action buttons
  actionRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  actionBtn: { flex: 1, borderRadius: 16, overflow: "hidden" },
  actionBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 13, paddingHorizontal: 12 },
  actionBtnText: { fontSize: 13, fontWeight: "700" },

  // Filters
  sectionHeading: { fontSize: 16, fontWeight: "800", color: C.textDark, marginBottom: 12, letterSpacing: 0.2 },
  filterGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  filterChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border,
  },
  filterChipActive: { backgroundColor: C.roseDark, borderColor: C.roseDark },
  filterEmoji: { fontSize: 14 },
  filterLabel: { fontSize: 13, fontWeight: "600", color: C.textMid },
  filterLabelActive: { color: C.white },

  // Empty state
  emptyCard: { backgroundColor: C.white, borderRadius: 16, padding: 24, alignItems: "center", marginBottom: 12 },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyText: { color: C.textLight, fontWeight: "600", fontSize: 14 },

  // Recipe cards
  recipeCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: C.white, borderRadius: 20, padding: 12, marginBottom: 12,
    shadowColor: C.rose, shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  recipeThumb: { width: 64, height: 64, borderRadius: 14, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  recipeInfo: { flex: 1 },
  recipeTitle: { fontSize: 15, fontWeight: "700", color: C.textDark, marginBottom: 6 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  timeTag: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#F5F0F2", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  timeTagText: { fontSize: 11, color: C.textLight, fontWeight: "600" },
  tag: { backgroundColor: C.blush, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  tagText: { fontSize: 11, color: C.roseDark, fontWeight: "700" },
  heartBtn: { borderRadius: 20, overflow: "hidden" },
  heartBtnInner: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },

  // Modals
  modalContainer: { flex: 1, padding: 24 },
  modalTitle: { fontSize: 24, fontWeight: "900", color: C.textDark, marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: C.textLight, fontWeight: "600", marginBottom: 20 },

  scannerWrapper: { flex: 1, borderRadius: 24, overflow: "hidden", marginBottom: 16 },
  scanner: { flex: 1 },
  scanOverlay: { ...StyleSheet.absoluteFillObject, borderWidth: 2, borderColor: C.rose, borderRadius: 24 },
  scanResultCard: { backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 16, alignItems: "center",
    shadowColor: C.rose, shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  scanResultText: { fontSize: 16, fontWeight: "700", color: C.mintDark },

  closeBtn: { borderRadius: 16, overflow: "hidden" },
  closeBtnInner: { paddingVertical: 14, alignItems: "center", borderRadius: 16 },
  closeBtnText: { fontSize: 15, fontWeight: "800", color: C.white },

  modalInput: {
    backgroundColor: C.white, borderRadius: 14,
    paddingVertical: 13, paddingHorizontal: 18,
    fontSize: 15, color: C.textDark, marginBottom: 12,
    shadowColor: C.rose, shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  saveBtn: { borderRadius: 16, overflow: "hidden", marginTop: 4 },
  saveBtnInner: { paddingVertical: 14, alignItems: "center" },
  saveBtnText: { fontSize: 15, fontWeight: "800", color: C.white },
  cancelBtn: { marginTop: 12, alignItems: "center", paddingVertical: 12 },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: C.textMid },
});