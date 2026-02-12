import { StyleSheet, Text, View, TouchableOpacity, Modal, TextInput ,Pressable } from "react-native";
import { router } from "expo-router";


export default function LeaderboardScreen() {
    
    return (    
    <TouchableOpacity onPress={() => router.push("/")}>
        <Text style={{ fontWeight: "700"}}>← Back to Home</Text>
    </TouchableOpacity>
    );

}