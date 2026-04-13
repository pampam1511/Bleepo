import { useHealth } from "@/lib/health /health-context";
import {getAllRecipes,getFavorites,getImageUrl,removeFavorite,saveFavorite,searchRecipes,type Recipe,type RecipeFavorite,} from "@/lib/recipe-service";
import { Ionicons } from "@expo/vector-icons";
import { Camera, CameraView } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const C = {
  blush:"#FADADD", roseLight:"#F9C5C9", rose:"#E8929A", roseDark:"#C45C6A",
  lavender:"#EDD9F5", lavDark:"#B07CC6", peach:"#FAE5D3", peachDark:"#E8A87C",
  mint:"#D4F0E8", mintDark:"#6BBFA3", cream:"#FFF8F5", white:"#FFFFFF",
  textDark:"#3D2030", textMid:"#7A4F5A", textLight:"#B08090", border:"#F0D5DA",
};

type DifficultyFilter = "all" | "easy" | "medium" | "hard";

const DIFFICULTY_FILTERS: { key: DifficultyFilter; label: string;  }[] = [
  { key: "all",label: "All"},
  { key: "easy",label: "Easy"},
  { key: "medium",label: "Medium"},
  { key: "hard",label: "Hard" },
];

export default function RecipeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { saveTodayCalories, getTodayCalories, saveTodayNutrition, getTodayNutrition } = useHealth();

  const [query,setQuery]= useState("");
  const [difficulty,setDifficulty]= useState<DifficultyFilter>("all");
  const [recipes,setRecipes]= useState<Recipe[]>([]);
  const [favorites,setFavorites]= useState<RecipeFavorite[]>([]);
  const [loading,setLoading]= useState(false);
  const [favLoading,setFavLoading]= useState(false);
  const [favIds,setFavIds]= useState<Set<string>>(new Set());

  const [scanVisible,setScanVisible]   = useState(false);
  const [manualVisible,setManualVisible] = useState(false);
  const [hasPermission,setHasPermission] = useState<boolean | null>(null);
  const [isScanning,setIsScanning]= useState(true);
  const [scanResult,setScanResult]= useState<any | null>(null);

  useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(({ status }) => setHasPermission(status === "granted"));
    loadAllRecipes();
  }, []);

  const loadAllRecipes = async () => {
    setLoading(true);
    try { setRecipes(await getAllRecipes()); }
    finally { setLoading(false); }
  };

  const loadFavorites = useCallback(async () => {
    setFavLoading(true);
    try {
      const data = await getFavorites();
      setFavorites(data);
      setFavIds(new Set(data.map((f) => f.recipeId)));
    } finally { setFavLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadFavorites(); }, [loadFavorites]));

  const handleSearch = async () => {
    if (!query.trim()) { loadAllRecipes(); return; }
    setLoading(true);
    try { setRecipes(await searchRecipes(query.trim())); }
    finally { setLoading(false); }
  };

  const displayedRecipes = difficulty === "all"
    ? recipes
    : recipes.filter((r) => r.difficulty === difficulty);

  const toggleFavorite = async (recipe: Recipe) => {
    if (favIds.has(recipe.$id)) {
      await removeFavorite(recipe.$id);
      setFavIds((prev) => { const s = new Set(prev); s.delete(recipe.$id); return s; });
      setFavorites((prev) => prev.filter((f) => f.recipeId !== recipe.$id));
    } else {
      await saveFavorite(recipe);
      setFavIds((prev) => new Set(prev).add(recipe.$id));
      await loadFavorites();
    }
  };

  const onBarCodeScanned = async ({ data }: { data: string }) => {
    if (!isScanning) return;
    setIsScanning(false);
    try {
      const res  = await fetch(
        `https://world.openfoodfacts.net/api/v2/product/${data}?fields=product_name,nutriments`,
        { headers: { "User-Agent": "Bloopy/1.0" } }
      );
      const json = await res.json();
      if (json?.product) {
        const n = json.product.nutriments || {};
        const nutrition = {
          calories: n["energy-kcal_100g"] ?? 0, protein: n["proteins_100g"] ?? 0,
          carbs: n["carbohydrates_100g"] ?? 0,  fat: n["fat_100g"] ?? 0,
        };
        setScanResult(nutrition);
        await saveFoodToDailyLogs(nutrition);
      } else {
        setScanResult({ name: "Not found" });
      }
    } catch { setScanResult({ name: "Error fetching data" }); }
  };

  
  

  const saveFoodToDailyLogs = async (food: { calories: number; protein: number; carbs: number; fat: number }) => {
    const [calDoc] = await Promise.all([getTodayCalories(), getTodayNutrition()]);
    await saveTodayCalories({
      targetCalories: Number(calDoc?.targetCalories ?? 0),
      dailyCalories: Number(calDoc?.dailyCaloriesIntake ?? 0) + food.calories,
      burnedCalories: Number(calDoc?.burnedCalories ?? 0),
      burnedGoal: Number(calDoc?.burnedGoal ?? 0),
      burnedSource: "manual", goalStatus: "active",
    });
    
  };

  const renderRecipe = ({ item }: { item: Recipe }) => {
    const imageUrl = getImageUrl(item.image);
    const isFav    = favIds.has(item.$id);
    const totalMin = (item.preparationTime ?? 0) + (item.cookingTime ?? 0);
    return (
      <TouchableOpacity
        style={s.recipeCard}
        onPress={() => router.push({ pathname: "/(screens)/recipe /[id]", params: { id: item.$id } })}
        activeOpacity={0.85}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={s.recipeThumb} />
        ) : (
          <LinearGradient colors={[C.blush, C.roseLight]} style={s.recipeThumb}>
          </LinearGradient>
        )}
        <View style={s.recipeInfo}>
          <Text style={s.recipeTitle} numberOfLines={2}>{item.recipeName}</Text>
          <View style={s.tagRow}>
            {totalMin > 0 && (
              <View style={s.timeTag}>
                <Ionicons name="time-outline" size={11} color={C.textLight} />
                <Text style={s.timeTagText}>{totalMin} min</Text>
              </View>
            )}
            <View style={[s.tag, {
              backgroundColor: item.difficulty === "easy" ? "#D4F0E8" : item.difficulty === "medium" ? "#FAE5D3" : "#FADADD"
            }]}>
              <Text style={[s.tagText, {
                color: item.difficulty === "easy" ? C.mintDark : item.difficulty === "medium" ? C.peachDark : C.roseDark
              }]}>{item.difficulty}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={s.heartBtn} onPress={() => toggleFavorite(item)} activeOpacity={0.7}>
          <LinearGradient colors={isFav ? [C.rose, C.roseDark] : [C.blush, C.roseLight]} style={s.heartBtnInner}>
            <Ionicons name={isFav ? "heart" : "heart-outline"} size={16} color={isFav ? C.white : C.roseDark} />
          </LinearGradient>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient colors={[C.cream, "#FFF0F3", C.cream]} style={s.screen}>
      <FlatList
        data={displayedRecipes}
        keyExtractor={(item) => item.$id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
        renderItem={renderRecipe}

        ListHeaderComponent={<>
          <Text style={s.title}>Recipes</Text>

          <View style={s.searchRow}>
            <TextInput
              style={s.searchInput} value={query} onChangeText={setQuery}
              placeholder="Search by name or ingredient..." placeholderTextColor={C.textLight}
              onSubmitEditing={handleSearch} returnKeyType="search"
            />
            <TouchableOpacity onPress={handleSearch} style={s.searchBtn}>
              <LinearGradient colors={[C.rose, C.roseDark]} style={s.searchBtnGradient}>
                <Ionicons name="search" size={18} color={C.white} />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={s.actionRow}>
            <TouchableOpacity onPress={() => setScanVisible(true)} style={s.actionBtn}>
              <LinearGradient colors={["#fbeadb", "#f4d1bd"]} style={s.actionBtnInner}>
                <Ionicons name="scan" size={18} color={C.peachDark} />
                <Text style={[s.actionBtnText, { color: C.peachDark }]}>Scan Barcode</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setManualVisible(true)} style={s.actionBtn}>
              <LinearGradient colors={[C.mint, "#B8EAD8"]} style={s.actionBtnInner}>
                <Ionicons name="add-circle-outline" size={18} color={C.mintDark} />
                <Text style={[s.actionBtnText, { color: C.mintDark }]}>Log Food</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <Text style={s.sectionHeading}>Filter by difficulty</Text>
          <View style={s.filterGrid}>
            {DIFFICULTY_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[s.filterChip, difficulty === f.key && s.filterChipActive]}
                onPress={() => setDifficulty(f.key)} activeOpacity={0.75}
              >
                <Text style={[s.filterLabel, difficulty === f.key && s.filterLabelActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.sectionHeading}>
            {query.trim() ? `Results for "${query}"` : "All Recipes"}
            {displayedRecipes.length > 0 ? ` (${displayedRecipes.length})` : ""}
          </Text>
          {loading && <View style={s.emptyCard}><Text  style={s.emptyText}>Searching...</Text></View>}
          {!loading && displayedRecipes.length === 0 && <View style={s.emptyCard}><Text  style={s.emptyText}>No recipes found</Text></View>}
        </>}

        ListFooterComponent={<>
          <Text style={[s.sectionHeading, { marginTop: 8 }]}>Favourite Recipes</Text>
          {favLoading ? <Text style={s.emptyText}>Loading...</Text>
          : favorites.length === 0 ? <View style={s.emptyCard}><Text style={s.emptyText}>No favourites saved yet</Text></View>
          : favorites.map((fav) => (
            <TouchableOpacity
              key={fav.$id} style={s.recipeCard} activeOpacity={0.85}
              onPress={() => router.push({ pathname: "/(screens)/recipe /[id]", params: { id: fav.recipeId } })}
            >
              {fav.image
                ? <Image source={{ uri: getImageUrl(fav.image) }} style={s.recipeThumb} />
                : <LinearGradient colors={[C.lavender, "#E8C9F5"]} style={s.recipeThumb}></LinearGradient>
              }
              <View style={s.recipeInfo}>
                <Text style={s.recipeTitle} numberOfLines={2}>{fav.title}</Text>
                <View style={s.tagRow}>
                  <View style={[s.tag, { backgroundColor: "#F5E8FD" }]}>
                    <Text style={[s.tagText, { color: C.lavDark }]}>Saved</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={s.heartBtn} onPress={() => removeFavorite(fav.recipeId).then(loadFavorites)}>
                <LinearGradient colors={[C.rose, C.roseDark]} style={s.heartBtnInner}>
                  <Ionicons name="heart" size={16} color={C.white} />
                </LinearGradient>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
          <View style={{ height: 40 }} />
        </>}
      />

      {/* Barcode Scanner Modal */}
      <Modal visible={scanVisible} animationType="slide">
        <LinearGradient colors={[C.cream, "#FFF0F3"]} style={[s.modalContainer, { paddingTop: insets.top + 16 }]}>
          <Text style={s.modalTitle}>Scan Barcode</Text>
          <Text style={s.modalSubtitle}>Point your camera at a product barcode</Text>
          {hasPermission === null  && <Text style={s.emptyText}>Requesting camera...</Text>}
          {hasPermission === false && <Text style={[s.emptyText, { color: C.roseDark }]}>Camera access denied</Text>}
          {hasPermission && (
            <View style={s.scannerWrapper}>
              <CameraView style={s.scanner} onBarcodeScanned={onBarCodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }} />
              <View style={s.scanOverlay} />
            </View>
          )}
          {scanResult && (
            <View style={s.scanResultCard}>
              <Text style={s.scanResultText}>
                {scanResult.name ? scanResult.name : `✓ ${scanResult.calories ?? 0} kcal logged`}
              </Text>
            </View>
          )}
          <TouchableOpacity style={s.closeBtn} onPress={() => { setScanVisible(false); setScanResult(null); setIsScanning(true); }}>
            <LinearGradient colors={[C.rose, C.roseDark]} style={s.closeBtnInner}>
              <Text style={s.closeBtnText}>Close Scanner</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </Modal>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  screen:        { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 },
  title:         { fontSize: 26, fontWeight: "900", color: C.textDark, marginBottom: 16, letterSpacing: 0.3, marginTop: 60 },
  searchRow:     { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  searchInput:   { flex: 1, backgroundColor: C.white, borderRadius: 20, paddingVertical: 12, paddingHorizontal: 18,
    fontSize: 15, color: C.textDark, shadowColor: C.rose, shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  searchBtn:         { borderRadius: 20, overflow: "hidden" },
  searchBtnGradient: { width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: 23 },
  actionRow:     { flexDirection: "row", gap: 12, marginBottom: 20 },
  actionBtn:     { flex: 1, borderRadius: 16, overflow: "hidden" },
  actionBtnInner:{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 13, paddingHorizontal: 12 },
  actionBtnText: { fontSize: 13, fontWeight: "700" },
  sectionHeading:   { fontSize: 16, fontWeight: "800", color: C.textDark, marginBottom: 12, letterSpacing: 0.2 },
  filterGrid:       { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  filterChip:       { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14,
    paddingVertical: 8, borderRadius: 20, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border },
  filterChipActive: { backgroundColor: C.roseDark, borderColor: C.roseDark },
  filterEmoji:      { fontSize: 14 },
  filterLabel:      { fontSize: 13, fontWeight: "600", color: C.textMid },
  filterLabelActive:{ color: C.white },
  emptyCard:  { backgroundColor: C.white, borderRadius: 16, padding: 24, alignItems: "center", marginBottom: 12 },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyText:  { color: C.textLight, fontWeight: "600", fontSize: 14 },
  recipeCard:   { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.white,
    borderRadius: 20, padding: 12, marginBottom: 12, shadowColor: C.rose, shadowOpacity: 0.08,
    shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  recipeThumb:  { width: 64, height: 64, borderRadius: 14, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  recipeInfo:   { flex: 1 },
  recipeTitle:  { fontSize: 15, fontWeight: "700", color: C.textDark, marginBottom: 6 },
  tagRow:       { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  timeTag:      { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#F5F0F2",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  timeTagText:  { fontSize: 11, color: C.textLight, fontWeight: "600" },
  tag:          { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  tagText:      { fontSize: 11, fontWeight: "700" },
  heartBtn:     { borderRadius: 20, overflow: "hidden" },
  heartBtnInner:{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  modalContainer: { flex: 1, padding: 24 },
  modalTitle:     { fontSize: 24, fontWeight: "900", color: C.textDark, marginBottom: 4 },
  modalSubtitle:  { fontSize: 14, color: C.textLight, fontWeight: "600", marginBottom: 20 },
  scannerWrapper: { flex: 1, borderRadius: 24, overflow: "hidden", marginBottom: 16 },
  scanner:        { flex: 1 },
  scanOverlay:    { ...StyleSheet.absoluteFillObject, borderWidth: 2, borderColor: C.rose, borderRadius: 24 },
  scanResultCard: { backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 16, alignItems: "center",
    shadowColor: C.rose, shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  scanResultText: { fontSize: 16, fontWeight: "700", color: C.mintDark },
  closeBtn:       { borderRadius: 16, overflow: "hidden" },
  closeBtnInner:  { paddingVertical: 14, alignItems: "center", borderRadius: 16 },
  closeBtnText:   { fontSize: 15, fontWeight: "800", color: C.white },
  modalInput:     { backgroundColor: C.white, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 18,
    fontSize: 15, color: C.textDark, marginBottom: 12, shadowColor: C.rose, shadowOpacity: 0.06,
    shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  saveBtn:      { borderRadius: 16, overflow: "hidden", marginTop: 4 },
  saveBtnInner: { paddingVertical: 14, alignItems: "center" },
  saveBtnText:  { fontSize: 15, fontWeight: "800", color: C.white },
  cancelBtn:    { marginTop: 12, alignItems: "center", paddingVertical: 12 },
  cancelBtnText:{ fontSize: 15, fontWeight: "600", color: C.textMid },
});