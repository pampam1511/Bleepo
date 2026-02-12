import { Stack } from "expo-router";

export default function ScreensLayout() {
  return (
    <Stack>
      <Stack.Screen name="calories" options={{ title: "Calories" }} />
      <Stack.Screen name="steps" options={{ title: "Activity" }} />
    </Stack>
  );
}
