import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  blush:     "#FADADD",
  roseLight: "#F9C5C9",
  rose:      "#E8929A",
  roseDark:  "#C45C6A",
  lavender:  "#EDD9F5",
  peach:     "#FAE5D3",
  mint:      "#D4F0E8",
  mintDark:  "#6BBFA3",
  cream:     "#FFF8F5",
  white:     "#FFFFFF",
  textDark:  "#3D2030",
  textMid:   "#7A4F5A",
  textLight: "#B08090",
  border:    "#F0D5DA",
};

export default function RecipeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [recipe, setRecipe] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const res  = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`);
      const json = await res.json();
      if (json?.meals?.length) {
        const m = json.meals[0];
        setRecipe({
          title: m.strMeal,
          image: m.strMealThumb,
          category: m.strCategory,
          area: m.strArea,
          instructions: m.strInstructions,
          ingredients: Array.from({ length: 20 })
            .map((_, i) => {
              const ing  = m[`strIngredient${i + 1}`];
              const meas = m[`strMeasure${i + 1}`];
              return ing ? `${meas ?? ""} ${ing}`.trim() : null;
            })
            .filter(Boolean),
        });
      }
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <LinearGradient colors={[C.cream, "#FFF0F3"]} style={styles.centered}>
        <Text style={styles.loadingEmoji}>🍽️</Text>
        <Text style={styles.loadingText}>Loading recipe...</Text>
      </LinearGradient>
    );
  }

  if (!recipe) {
    return (
      <LinearGradient colors={[C.cream, "#FFF0F3"]} style={styles.centered}>
        <Text style={styles.loadingEmoji}>😕</Text>
        <Text style={styles.loadingText}>Recipe not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnStandalone}>
          <Text style={styles.backBtnText}>← Go Back</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[C.cream, "#FFF0F3", C.cream]} style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Back button ── */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        {/* ── Hero image ── */}
        {recipe.image ? (
          <Image source={{ uri: recipe.image }} style={styles.heroImage} />
        ) : (
          <LinearGradient colors={[C.blush, C.roseLight]} style={[styles.heroImage, styles.heroPlaceholder]}>
            <Text style={styles.heroPlaceholderEmoji}>🍽️</Text>
          </LinearGradient>
        )}

        {/* ── Title & tags ── */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{recipe.title}</Text>
          <View style={styles.metaRow}>
            {recipe.category && (
              <View style={styles.metaTag}>
                <Text style={styles.metaTagText}>🍴 {recipe.category}</Text>
              </View>
            )}
            {recipe.area && (
              <View style={[styles.metaTag, { backgroundColor: C.mint }]}>
                <Text style={[styles.metaTagText, { color: C.mintDark }]}>🌍 {recipe.area}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Ingredients ── */}
        <View style={styles.section}>
          <LinearGradient colors={["#FDE8ED", "#FAD5DC"]} style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🛒 Ingredients</Text>
            <Text style={styles.sectionCount}>{recipe.ingredients.length} items</Text>
          </LinearGradient>
          <View style={styles.sectionBody}>
            {recipe.ingredients.map((ingredient: string, i: number) => (
              <View key={i} style={styles.ingredientRow}>
                <View style={styles.ingredientDot} />
                <Text style={styles.ingredientText}>{ingredient}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Instructions ── */}
        <View style={styles.section}>
          <LinearGradient colors={[C.lavender, "#E8C9F5"]} style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📋 Instructions</Text>
          </LinearGradient>
          <View style={styles.sectionBody}>
            {recipe.instructions
              .split("\n")
              .filter((line: string) => line.trim().length > 0)
              .map((step: string, i: number) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step.trim()}</Text>
                </View>
              ))}
          </View>
        </View>

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  // Loading / error
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingEmoji: { fontSize: 48, marginBottom: 12 },
  loadingText: { fontSize: 17, fontWeight: "700", color: C.textMid },
  backBtnStandalone: { marginTop: 20, backgroundColor: C.blush, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },

  // Back button
  backBtn: { margin: 20, marginBottom: 12, alignSelf: "flex-start",
    backgroundColor: C.white, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    shadowColor: C.rose, shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  backBtnText: { fontSize: 14, fontWeight: "700", color: C.roseDark },

  // Hero
  heroImage: { width: "100%", height: 260, marginBottom: 0 },
  heroPlaceholder: { alignItems: "center", justifyContent: "center" },
  heroPlaceholderEmoji: { fontSize: 64 },

  // Title block
  titleBlock: { backgroundColor: C.white, padding: 20, paddingTop: 18, marginBottom: 16,
    shadowColor: C.rose, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  title: { fontSize: 24, fontWeight: "900", color: C.textDark, marginBottom: 10, lineHeight: 30 },
  metaRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  metaTag: { backgroundColor: C.blush, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  metaTagText: { fontSize: 12, fontWeight: "700", color: C.roseDark },

  // Sections
  section: { marginHorizontal: 16, marginBottom: 16, borderRadius: 20, overflow: "hidden",
    shadowColor: C.rose, shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: C.textDark },
  sectionCount: { fontSize: 12, fontWeight: "700", color: C.textLight },
  sectionBody: { backgroundColor: C.white, padding: 16 },

  // Ingredients
  ingredientRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  ingredientDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.rose, marginTop: 6, flexShrink: 0 },
  ingredientText: { flex: 1, fontSize: 14, fontWeight: "600", color: C.textMid, lineHeight: 22 },

  // Steps
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.blush,
    alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 },
  stepNumberText: { fontSize: 12, fontWeight: "800", color: C.roseDark },
  stepText: { flex: 1, fontSize: 14, fontWeight: "500", color: C.textMid, lineHeight: 22 },
});