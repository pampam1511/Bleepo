import { ID, Permission, Query, Role } from "react-native-appwrite";
import { account, databases, DATABASE_ID, RECIPES, RECIPE_FAVORITES, RECIPE_INGREDIENTS, RECIPE_IMAGES_BUCKET_ID } from "@/lib/appwrite";



// ── Types ─────────────────────────────────────────────────────────────────────

export type Recipe = {
  $id:             string;
  recipeName:      string;
  instructions:    string;  // pipe-separated e.g. "Step 1|Step 2|Step 3"
  preparationTime: number;
  cookingTime:     number;
  servings:        number;
  difficulty:      "easy" | "medium" | "hard";
  image:           string;  // Appwrite Storage file ID
};

export type RecipeIngredient = {
  $id:        string;
  recipeId:   string;
  name:       string;
  amount:     string;
  orderIndex: number;
};

export type RecipeFavorite = {
  $id:      string;
  userId:   string;
  recipeId: string;
  title:    string;
  image:    string;
  savedAt:  string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// Build the Appwrite Storage image URL from a file ID
export function getImageUrl(fileId: string): string {
  if (!fileId) return "";
  const endpoint  = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!;
  const projectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!;
  
  return `${endpoint}/storage/buckets/${RECIPE_IMAGES_BUCKET_ID}/files/${fileId}/view?project=${projectId}`;
}

// Split pipe-separated instructions into a numbered array of steps
export function parseInstructions(raw: string): string[] {
  if (!raw) return [];
  return raw.split("|").map((s) => s.trim()).filter(Boolean);
}

// ── Recipes ───────────────────────────────────────────────────────────────────

// Get all recipes — used on the browse/home screen
export async function getAllRecipes(): Promise<Recipe[]> {
  try {
    const res = await databases.listDocuments(DATABASE_ID, RECIPES, [
      Query.limit(100),
      Query.orderDesc("$createdAt"),
    ]);
    return res.documents as unknown as Recipe[];
  } catch (e) {
    console.error("getAllRecipes error:", e);
    return [];
  }
}

// Get a single recipe by its ID
export async function getRecipeById(id: string): Promise<Recipe | null> {
  try {
    const doc = await databases.getDocument(DATABASE_ID, RECIPES, id);
    return doc as unknown as Recipe;
  } catch (e) {
    console.error("getRecipeById error:", e);
    return null;
  }
}

// Search recipes by name using Appwrite fulltext index
export async function searchRecipesByName(query: string): Promise<Recipe[]> {
  try {
    const res = await databases.listDocuments(DATABASE_ID, RECIPES, [
      Query.search("recipeName", query),
      Query.limit(50),
    ]);
    return res.documents as unknown as Recipe[];
  } catch (e) {
    console.error("searchRecipesByName error:", e);
    return [];
  }
}

// Search recipes by ingredient:
// 1. Find ingredient rows matching the search term
// 2. Extract unique recipeIds from those rows
// 3. Fetch and return those recipes
export async function searchRecipesByIngredient(ingredient: string): Promise<Recipe[]> {
  try {
    const ingRes = await databases.listDocuments(DATABASE_ID, RECIPE_INGREDIENTS, [
      Query.search("name", ingredient),
      Query.limit(200),
    ]);
    if (!ingRes.documents.length) return [];

    const recipeIds = Array.from(
      new Set(ingRes.documents.map((d: any) => d.recipeId as string))
    );

    const res = await databases.listDocuments(DATABASE_ID, RECIPES, [
      Query.equal("$id", recipeIds),
      Query.limit(50),
    ]);
    return res.documents as unknown as Recipe[];
  } catch (e) {
    console.error("searchRecipesByIngredient error:", e);
    return [];
  }
}

// Combined search — checks both recipe name AND ingredients, deduplicates results
export async function searchRecipes(query: string): Promise<Recipe[]> {
  try {
    const [byName, byIngredient] = await Promise.all([
      searchRecipesByName(query),
      searchRecipesByIngredient(query),
    ]);
    const seen = new Set<string>();
    const merged: Recipe[] = [];
    [...byName, ...byIngredient].forEach((r) => {
      if (!seen.has(r.$id)) { seen.add(r.$id); merged.push(r); }
    });
    return merged;
  } catch (e) {
    console.error("searchRecipes error:", e);
    return [];
  }
}

// Filter recipes by difficulty level
export async function filterRecipesByDifficulty(
  difficulty: "easy" | "medium" | "hard"
): Promise<Recipe[]> {
  try {
    const res = await databases.listDocuments(DATABASE_ID, RECIPES, [
      Query.equal("difficulty", difficulty),
      Query.limit(100),
    ]);
    return res.documents as unknown as Recipe[];
  } catch (e) {
    console.error("filterRecipesByDifficulty error:", e);
    return [];
  }
}

// ── Ingredients ───────────────────────────────────────────────────────────────

// Get all ingredients for a recipe, sorted by orderIndex
export async function getIngredients(recipeId: string): Promise<RecipeIngredient[]> {
  try {
    const res = await databases.listDocuments(DATABASE_ID, RECIPE_INGREDIENTS, [
      Query.equal("recipeId", recipeId),
      Query.orderAsc("orderIndex"),
      Query.limit(100),
    ]);
    return res.documents as unknown as RecipeIngredient[];
  } catch (e) {
    console.error("getIngredients error:", e);
    return [];
  }
}

// ── Favourites ────────────────────────────────────────────────────────────────

// Get the current user's saved favourites
export async function getFavorites(): Promise<RecipeFavorite[]> {
  try {
    const user = await account.get();
    const res  = await databases.listDocuments(DATABASE_ID, RECIPE_FAVORITES, [
      Query.equal("userId", user.$id),
      Query.orderDesc("savedAt"),
    ]);
    return res.documents as unknown as RecipeFavorite[];
  } catch (e) {
    console.error("getFavorites error:", e);
    return [];
  }
}

// Save a recipe to favourites — silently skips if already saved
export async function saveFavorite(recipe: Recipe): Promise<void> {
  try {
    const user = await account.get();
    const existing = await databases.listDocuments(DATABASE_ID, RECIPE_FAVORITES, [
      Query.equal("userId",   user.$id),
      Query.equal("recipeId", recipe.$id),
      Query.limit(1),
    ]);
    if (existing.documents.length > 0) return;

    await databases.createDocument(
      DATABASE_ID, RECIPE_FAVORITES, ID.unique(),
      {
        userId:   user.$id,
        recipeId: recipe.$id,
        title:    recipe.recipeName,
        image:    recipe.image ?? "",
        savedAt:  new Date().toISOString(),
      },
      [
        Permission.read(Role.user(user.$id)),
        Permission.update(Role.user(user.$id)),
        Permission.delete(Role.user(user.$id)),
      ]
    );
  } catch (e: any) {
    console.error("saveFavorite error:", e?.message);
  }
}

// Remove a recipe from favourites
export async function removeFavorite(recipeId: string): Promise<void> {
  try {
    const user = await account.get();
    const existing = await databases.listDocuments(DATABASE_ID, RECIPE_FAVORITES, [
      Query.equal("userId",   user.$id),
      Query.equal("recipeId", recipeId),
      Query.limit(1),
    ]);
    if (existing.documents.length > 0) {
      await databases.deleteDocument(DATABASE_ID, RECIPE_FAVORITES, existing.documents[0].$id);
    }
  } catch (e: any) {
    console.error("removeFavorite error:", e?.message);
  }
}

// Check if a recipe is already in the user's favourites
export async function isFavorite(recipeId: string): Promise<boolean> {
  try {
    const user = await account.get();
    const res  = await databases.listDocuments(DATABASE_ID, RECIPE_FAVORITES, [
      Query.equal("userId",   user.$id),
      Query.equal("recipeId", recipeId),
      Query.limit(1),
    ]);
    return res.documents.length > 0;
  } catch {
    return false;
  }
}