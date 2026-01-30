import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ 
      headerStyle: { backgroundColor: "f5f5f5"},
      headerShadowVisible:false,
      tabBarStyle: {
        backgroundColor: "f5f5f5",
        borderTopWidth: 0,
        elevation: 0,
        shadowOpacity: 0,
      },
      
      tabBarActiveTintColor: "pink",
      tabBarInactiveTintColor: "teal",
    
    
    }}
    >
      
      <Tabs.Screen 
      name="index" 
      options={{ 
        title: "Home",
        tabBarIcon: ({color}) => ( 
        <FontAwesome5 name="home" size={24} color={color} />
      ),
    }} 
    />
      <Tabs.Screen 
      name="calender" 
      options={{ 
        title: "Calender",
        tabBarIcon: ({color}) =>
        (<Entypo name="calendar" size={24} color={color} />
        
        ),

      
    
    }}
    />

    <Tabs.Screen 
    name="recipe" 
    options={{
      title: "Recipes",
      tabBarIcon: ({color}) =>
      (<FontAwesome6 name="bowl-food" size={24} color={color} />
      ),



    }}
  />

  <Tabs.Screen
  name="profile"
  options={{
    title: "Profile",
    tabBarIcon: ({color}) =>
    (<Ionicons name="person-sharp" size={24} color={color} />)


  }}
  />


    </Tabs>
  
   
   
    
  

  );

}
