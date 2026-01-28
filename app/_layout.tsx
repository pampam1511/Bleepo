// app/_layout.tsx
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";

export default function RootLayout() {
  const router = useRouter();
  const isAuth = false; 

  useEffect(() => {
    const timerId = setTimeout(() => {
      if (!isAuth) {
        router.replace("/auth");
      }
    }, 0);
  
    return () => clearTimeout(timerId);
  }, []);

  
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}