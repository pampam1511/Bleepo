import { Stack } from "expo-router";

export default function ScreensLayout() {
  return (
    <Stack>
      <Stack.Screen name="calories" options={{ title: "Calories", headerShown:false, }} />
      <Stack.Screen name="steps" options={{ title: "Activity", headerShown:false,}} />
      <Stack.Screen name="leaderboard" options={{ title: "Leader Board", headerShown:false, }} />
      <Stack.Screen name="recipe/[id]" options={{ title: "Recipe Detail", headerShown:false }} />
    </Stack>
  );
}
