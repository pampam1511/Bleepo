import { Stack } from "expo-router";

export default function ScreensLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="calories" />
      <Stack.Screen name="steps" />
      <Stack.Screen name="leaderboard" />
      <Stack.Screen name="recipe/[id]" />
    </Stack>
  );
}