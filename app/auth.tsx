import { KeyboardAvoidingView, Platform, View, } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";

export default function AuthScreen() {
    //const[isSignUp, setIsSignUp] = useState();
    return <KeyboardAvoidingView 
    behavior={Platform.OS === "ios" ? "padding" : "height"} 
    >
        <View>
            <Text> Create account </Text>

            <TextInput 
            label="Email" 
            autoCapitalize="none" 
            keyboardType="email-address" 
            placeholder="example@gmail.com" 
            mode="outlined"
            />

<TextInput 
            label="Password" 
            autoCapitalize="none" 
            keyboardType="email-address" 
            mode="outlined"
            />

            <Button mode="contained">Sign up</Button>

            <Button mode="text">Have an account? Sign in</Button>

        </View>

    </KeyboardAvoidingView>

}