import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  getRecipeById,
  getIngredients,
  getImageUrl,
  parseInstructions,
  isFavorite,
  saveFavorite,
  removeFavorite,
  type Recipe,
  type RecipeIngredient,
} from "@/lib/recipe-service";

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
  blush:     "#FADADD", roseLight: "#F9C5C9", rose:     "#E8929A", roseDark:  "#C45C6A",
  lavender:  "#EDD9F5", lavDark:   "#B07CC6", peach:    "#FAE5D3", peachDark: "#E8A87C",
  mint:      "#D4F0E8", mintDark:  "#6BBFA3", cream:    "#FFF8F5", white:     "#FFFFFF",
  textDark:  "#3D2030", textMid:   "#7A4F5A", textLight:"#B08090", border:    "#F0D5DA",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function difficultyStyle(d: string) {
  if (d === "easy")   return { bg: "#D4F0E8", text: C.mintDark };
  if (d === "medium") return { bg: "#FAE5D3", text: C.peachDark };
  return { bg: "#FADADD", text: C.roseDark };
}

// ── Section card — same pattern as CalorieScreen ──────────────────────────────
function SectionCard({ title, count, gradientColors, children }: {
  title: string; count?: number;
  gradientColors?: [string, string]; children: React.ReactNode;
}) {
  return (
    <View style={sc.card}>
      <LinearGradient colors={gradientColors ?? ["#FDE8ED", "#FAD5DC"]} style={sc.header}>
        <Text style={sc.title}>{title}</Text>
        {count !== undefined && (
          <Text style={sc.count}>{count} items</Text>
        )}
      </LinearGradient>
      <View style={sc.body}>{children}</View>
    </View>
  );
}
const sc = StyleSheet.create({
  card:   { marginHorizontal: 16, marginBottom: 16, borderRadius: 20, overflow: "hidden",
    backgroundColor: C.white, shadowColor: C.rose, shadowOpacity: 0.08,
    shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, padding: 16 },
  emoji:  { fontSize: 18 },
  title:  { flex: 1, fontSize: 15, fontWeight: "800", color: C.textDark },
  count:  { fontSize: 12, fontWeight: "700", color: C.textLight },
  body:   { padding: 16 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function RecipeDetail() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();

  const [recipe,      setRecipe]      = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [steps,       setSteps]       = useState<string[]>([]);
  const [fav,         setFav]         = useState(false);
  const [loading,     setLoading]     = useState(true);

  // ── Load all data — same pattern as CalorieScreen.loadAll ──
  const loadAll = useCallback(async () => {
    if (!id) return;
    try {
      const [recipeData, ingredientData, favStatus] = await Promise.all([
        getRecipeById(id),
        getIngredients(id),
        isFavorite(id),
      ]);

      if (recipeData) {
        setRecipe(recipeData);
        setSteps(parseInstructions(recipeData.instructions ?? ""));
      }
      setIngredients(ingredientData);
      setFav(favStatus);
    } catch (err) {
      console.error("RecipeDetail loadAll failed:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  // ── Favourite toggle ──
  const toggleFav = async () => {
    if (!recipe) return;
    if (fav) {
      await removeFavorite(recipe.$id);
      setFav(false);
    } else {
      await saveFavorite(recipe);
      setFav(true);
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <LinearGradient colors={[C.cream, "#FFF0F3"]} style={styles.centered}>
        <Text style={styles.loadingText}>Loading recipe...</Text>
      </LinearGradient>
    );
  }

  // ── Not found state ──
  if (!recipe) {
    return (
      <LinearGradient colors={[C.cream, "#FFF0F3"]} style={styles.centered}>
        <Text style={styles.loadingText}>Recipe not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnStandalone}>
          <Text style={styles.backBtnText}>← Go Back</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  const imageUrl   = getImageUrl(recipe.image);
  const totalMins  = (recipe.preparationTime ?? 0) + (recipe.cookingTime ?? 0);
  const diffStyle  = difficultyStyle(recipe.difficulty ?? "easy");

  // ── Render ──
  return (
    <LinearGradient colors={[C.cream, "#FFF0F3", C.cream]} style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Back button */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        {/* Hero image */}
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.heroImage} />
        ) : (
          <LinearGradient colors={[C.blush, C.roseLight]} style={[styles.heroImage, styles.heroPlaceholder]}>
          </LinearGradient>
        )}

        {/* Title block */}
        <View style={styles.titleBlock}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{recipe.recipeName}</Text>
            {/* Favourite button */}
            <TouchableOpacity onPress={toggleFav} style={styles.favBtn} activeOpacity={0.7}>
              <LinearGradient
                colors={fav ? [C.rose, C.roseDark] : [C.blush, C.roseLight]}
                style={styles.favBtnInner}
              >
                <Ionicons
                  name={fav ? "heart" : "heart-outline"}
                  size={18}
                  color={fav ? C.white : C.roseDark}
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Stat pills */}
          <View style={styles.statRow}>
            {recipe.preparationTime > 0 && (
              <View style={styles.statPill}>
                <Text style={styles.statLabel}>PREP</Text>
                <Text style={styles.statValue}>{recipe.preparationTime} min</Text>
              </View>
            )}
            {recipe.cookingTime > 0 && (
              <View style={styles.statPill}>
                <Text style={styles.statLabel}>COOK</Text>
                <Text style={styles.statValue}>{recipe.cookingTime} min</Text>
              </View>
            )}
            {totalMins > 0 && (
              <View style={styles.statPill}>
                <Text style={styles.statLabel}>TOTAL</Text>
                <Text style={styles.statValue}>{totalMins} min</Text>
              </View>
            )}
            {recipe.servings > 0 && (
              <View style={styles.statPill}>
                <Text style={styles.statLabel}>SERVES</Text>
                <Text style={styles.statValue}>{recipe.servings}</Text>
              </View>
            )}
            <View style={[styles.statPill, { backgroundColor: diffStyle.bg }]}>
              <Text style={[styles.statValue, { color: diffStyle.text }]}>
                {recipe.difficulty}
              </Text>
            </View>
          </View>
        </View>

        {/* Ingredients */}
        <SectionCard
          title="Ingredients"
          count={ingredients.length}
          gradientColors={["#FDE8ED", "#FAD5DC"]}
        >
          {ingredients.length === 0 ? (
            <Text style={styles.emptyText}>No ingredients listed</Text>
          ) : (
            ingredients.map((ing, i) => (
              <View key={ing.$id} style={styles.ingredientRow}>
                <Text style={styles.ingredientNum}>{i + 1}.</Text>
                <Text style={styles.ingredientAmount}>{ing.amount}</Text>
                <Text style={styles.ingredientName}>{ing.name}</Text>
              </View>
            ))
          )}
        </SectionCard>

        {/* Instructions */}
        <SectionCard
          title="Instructions"
          gradientColors={[C.lavender, "#E8C9F5"]}
        >
          {steps.length === 0 ? (
            <Text style={styles.emptyText}>No instructions listed</Text>
          ) : (
            steps.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))
          )}
        </SectionCard>

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:        { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  // Loading / error
  centered:          { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingEmoji:      { fontSize: 48, marginBottom: 12 },
  loadingText:       { fontSize: 17, fontWeight: "700", color: C.textMid },
  backBtnStandalone: { marginTop: 20, backgroundColor: C.blush, paddingHorizontal: 24,
    paddingVertical: 12, borderRadius: 20 },

  // Back button
  backBtn:     { margin: 20, marginBottom: 12, alignSelf: "flex-start", marginTop: 80,},
  backBtnText: { fontSize: 14, fontWeight: "700", color: C.roseDark },

  // Hero
  heroImage:            { width: "100%", height: 260 },
  heroPlaceholder:      { alignItems: "center", justifyContent: "center" },

  // Title block
  titleBlock: { backgroundColor: C.white, padding: 20, marginBottom: 16,
    shadowColor: C.rose, shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  titleRow:   { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  title:      { flex: 1, fontSize: 22, fontWeight: "900", color: C.textDark, lineHeight: 28 },

  // Favourite button
  favBtn:      { borderRadius: 20, overflow: "hidden" },
  favBtnInner: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },

  // Stat pills
  statRow:    { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statPill:   { backgroundColor: "#FFF0F3", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
    alignItems: "center" },
  statLabel:  { fontSize: 9, fontWeight: "700", color: C.textLight, textTransform: "uppercase",
    letterSpacing: 0.5, marginBottom: 2 },
  statValue:  { fontSize: 13, fontWeight: "800", color: C.textDark },

  // Ingredients
  ingredientRow:    { flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#F5EAED" },
  ingredientNum:    { fontSize: 12, fontWeight: "700", color: C.roseDark, width: 20 },
  ingredientAmount: { fontSize: 12, color: C.textLight, fontWeight: "600", minWidth: 60 },
  ingredientName:   { flex: 1, fontSize: 14, fontWeight: "600", color: C.textDark },

  // Steps
  stepRow:        { flexDirection: "row", alignItems: "flex-start", gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F5EAED" },
  stepNumber:     { width: 28, height: 28, borderRadius: 14, backgroundColor: C.blush,
    alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 },
  stepNumberText: { fontSize: 12, fontWeight: "800", color: C.roseDark },
  stepText:       { flex: 1, fontSize: 14, fontWeight: "500", color: C.textMid, lineHeight: 22 },

  emptyText: { fontSize: 13, color: C.textLight, fontWeight: "600" },
});