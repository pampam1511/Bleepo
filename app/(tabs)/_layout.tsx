import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import Entypo from "@expo/vector-icons/Entypo";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { useEffect, useState } from "react";
import { useProfile } from "@/lib/profile-context";
import { View } from "react-native";

export default function TabsLayout() {
  const { getUserProfile } = useProfile();
  const [role, setRole] = useState<"user" | "provider">("user");
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect (() =>{
    const load = async () => {
      try { 
        const doc = await getUserProfile();
        setRole(doc?.role === "provider" ? "provider" : "user");
      } finally{
        setLoadingRole(false);
      }
    };
    load();
  }, []);


  if (loadingRole) {
    return <View style={{ flex: 1, backgroundColor: "#fff" }} />;
  }

  const isProvider = role === "provider";

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#f5f5f5" },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: "#f5f5f5",
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
          href: isProvider ? null : undefined, 
          tabBarIcon: ({ color }) => <FontAwesome5 name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calender"
        options={{
          title: "Calender",
          href: isProvider ? null : undefined, 
          tabBarIcon: ({ color }) => <Entypo name="calendar" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="recipe"
        options={{
          title: "Recipes",
          href: isProvider ? null : undefined, 
          tabBarIcon: ({ color }) => <FontAwesome6 name="bowl-food" size={24} color={color} />,
        }}
      />

      {/* SHARED TAB */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <Ionicons name="person-sharp" size={24} color={color} />,
        }}
      />

      {/* PROVIDER TAB */}
      <Tabs.Screen
        name="provider-reports"
        options={{
          title: "Reports",
          href: isProvider ? undefined : null, 
          tabBarIcon: ({ color }) => <Entypo name="clipboard" size={24} color={color} />,
        }}
      />
    </Tabs>
  );




}
