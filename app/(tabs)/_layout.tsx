import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import Entypo from "@expo/vector-icons/Entypo";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { useEffect, useState } from "react";
import { useProfile } from "@/lib/profile-context";
import { ActivityIndicator,View } from "react-native";
import { useAuth } from "@/lib/auth-context";

export default function TabsLayout() {
  const { getUserProfile } = useProfile();
  const [role, setRole] = useState<"user" | "provider"| null>(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const {user, isLoadingUser} = useAuth();

  useEffect (() =>{
    if (isLoadingUser) return;
    if(!user){
      setLoadingRole(false);
      return;
    }

    let mounted = true;
    const load = async () => {
      try { 
        const doc = await getUserProfile();
        if (mounted){
          setRole(doc?.role === "provider" ? "provider" : "user");
        }  
      } catch{
        if(mounted)setRole("user")

      }finally{
        if (mounted)setLoadingRole(false);
      }
    };
    load();
    return () => {mounted = false;};
  }, [user, isLoadingUser]); 

   // Show blank screen while loading (no flash)
  if (isLoadingUser || loadingRole || role === null) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FDE8ED", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#E8929A" />
      </View>
    );
  }

  const isProvider = role === "provider";

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#FDE8ED" },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: "#fff5f7",
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: "pink",
        tabBarInactiveTintColor: "teal",
      }}
    >
      {/* USER TABS */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerShown:false,
          href: isProvider ? null : undefined, 
          tabBarIcon: ({ color }) => <FontAwesome5 name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calender"
        options={{
          title: "Calender",
          headerShown: false,
          href: isProvider ? null : undefined, 
          tabBarIcon: ({ color }) => <Entypo name="calendar" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="recipe"
        options={{
          title: "Recipes",
          headerShown: false,
          href: isProvider ? null : undefined, 
          tabBarIcon: ({ color }) => <FontAwesome6 name="bowl-food" size={24} color={color} />,
        }}
      />

      {/* SHARED TAB */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          href: isProvider ? null : undefined,
          tabBarIcon: ({ color }) => <Ionicons name="person-sharp" size={24} color={color} />,
        }}
      />

      {/* PROVIDER TAB */}
      <Tabs.Screen
        name="provider-reports"
        options={{
          title: "Reports",
          headerShown: false,
          href: isProvider ? undefined : null, 
          tabBarIcon: ({ color }) => <Entypo name="clipboard" size={24} color={color} />,
        }}
      />
    </Tabs>
  );


}
