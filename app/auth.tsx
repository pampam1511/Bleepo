import { KeyboardAvoidingView, Platform, View, Text } from "react-native";

export default function AuthScreen() {
    return <KeyboardAvoidingView 
    behavior={Platform.OS === "ios" ? "padding" : "height"} 
    >
        <View>
            <Text> Create account </Text>
        </View>

    </KeyboardAvoidingView>

}