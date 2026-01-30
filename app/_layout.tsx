// app/_layout.tsx
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";

function RootLayoutC() {
  const router = useRouter();
  //const isAuth = false; 
  const { user, isLoadingUser} = useAuth();
  const segments = useSegments()

  useEffect(() => {
  

    const inAuthGroup = segments[0] === "auth";

    //const timerId = setTimeout(() => {}, 0);
    if (!user && !inAuthGroup && !isLoadingUser) {
      router.replace("/auth");
    }else if (user && inAuthGroup && !isLoadingUser) {
      router.replace("/");

    }
  
    //return () => clearTimeout(timerId);
  }, [user, segments]);

 

  return (
    <Stack>
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return(
    <AuthProvider>
      <RootLayoutC />
    </AuthProvider>
  );
}