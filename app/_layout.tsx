// app/_layout.tsx
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { CommunityProvider } from "@/lib/community-context";
import { HealthProvider } from "@/lib/health /health-context";
import { ProfileProvider } from "@/lib/profile-context";
import { ProviderReportProvider } from "@/lib/provider-access-context";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

function RootLayoutC() {
  const router = useRouter();
  //const isAuth = false; 
  const { user, isLoadingUser} = useAuth();
  const segments = useSegments()

  useEffect(() => {
    if(isLoadingUser) return;
  

    const inAuthGroup = segments[0] === "auth";

    //const timerId = setTimeout(() => {}, 0);
    if (!user && !inAuthGroup && !isLoadingUser) {
      router.replace("/auth");
    }else if (user && inAuthGroup && !isLoadingUser) {
      router.replace("/(tabs)");

    }
  
    //return () => clearTimeout(timerId);
  }, [user,isLoadingUser]);

  return (
    <Stack>
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(screens)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return(
    <AuthProvider>
        <HealthProvider>
          <ProfileProvider>
            <ProviderReportProvider >
              <CommunityProvider>      
                <SafeAreaProvider>
                  <RootLayoutC />
                </SafeAreaProvider>
              </CommunityProvider> 
            </ProviderReportProvider>
          </ProfileProvider> 
      </HealthProvider>
    </AuthProvider>
  );
}