import { KeyboardAvoidingView, Platform, View, } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";

export default function AuthScreen() {
    const[isSignUp, setIsSignUp] = useState<boolean>(false);

    const handleSwitchMode = () => {
        setIsSignUp((prev) => !prev);

    };



    return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} >
         <View>
            <Text> {isSignUp ? "Create account" : "Welcome Back" }</Text>
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
            
            <Button mode="contained">{isSignUp ? "Sign up" : "Sign in" }</Button>
            
            <Button mode="text" onPress={handleSwitchMode}>{isSignUp ? "Have an account? Sign in" : "Dont have an account? Sign up"}</Button>
            
            </View>
            
            </KeyboardAvoidingView>

    );
   

}