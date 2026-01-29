import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Button, Text, TextInput, useTheme } from "react-native-paper";

export default function AuthScreen() {
    const[isSignUp, setIsSignUp] = useState<boolean>(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [name, setName] = useState("");
    const [error,setError] = useState<String | null>("");
    const theme = useTheme();

    const handleAuth = async () => {
        if(!email || !password) {
            setError("Please fill in all fields");
            return;
        }

        if (password.length < 6){
            setError("Passwrod must be at least 8 characters long.");
            return;
        }

        setError(null);

    };
    const handleSwitchMode = () => {
        setIsSignUp((prev) => !prev);

    };

    return (
    <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={styles.container}
        

    >
        <ScrollView contentContainerStyle={styles.scrollContent}>
            {/*Header*/}
            <View style={styles.header}>
                <Text variant="headlineMedium" style={styles.hello}>HELLO</Text>
                <Text variant="titleLarge" style={styles.welcome}>
                    Welcome to Bloopy!
                </Text>
            </View>

            {/*Card*/}
            <View style={styles.card}>
                
                    <Text style={styles.cardTitle}>
                    {isSignUp ? "SIGN UP" : "Login"}
                    </Text >

                    {isSignUp && (
                        <TextInput
                        label="NAME"
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                        mode="flat"
                        left={<TextInput.Icon icon="account" />}
                        underlineColor="transparent"
                        contentStyle={styles.inputContainer}
                        

                    />   
                    )}
                    <TextInput 
                        label="EMAIL"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        mode="flat"
                        left={<TextInput.Icon icon="email" />}
                        underlineColor="transparent"
                        contentStyle={styles.inputContainer}
                    />

                    <TextInput 
                        label="PASSWORD"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        mode="flat"
                        left={<TextInput.Icon icon="lock" />}
                        underlineColor="transparent"
                        contentStyle={styles.inputContainer}
                    />

                    

                    {/*Confirm password only for sign up */}
                    {isSignUp && (
                        <TextInput
                            label="CONFIRM PASSWORD"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            mode="flat"
                            left={<TextInput.Icon icon="lock-check" />}
                            underlineColor="transparent"
                            contentStyle={styles.inputContainer}
                      />
                    )}

                    {/* forgot password only for login */}
                    {!isSignUp && (
                         <Text
                         variant="labelMedium"
                         style={styles.forgot}
                         onPress={() => alert("Forgot password?")}
                       >
                         Forgot password
                       </Text>
                    )}

                    {error && (
                    <Text style={{color: theme.colors.error}}>{error}</Text>
                    )}

                    <Button 
                    mode="outlined" 
                    style={styles.button}
                    labelStyle={styles.button}
                    //onPress={handleAuth} 
                    onPress={handleAuth}> 
                    {isSignUp ? "SIGN UP" : "Sign in"}
                    </Button>

                    <Button 
                    mode="text" 
                    onPress={handleSwitchMode} 
                    style={styles.switchButton} >
                        {isSignUp ? "Have an account? Sign in" : "Dont have an account?"}

                    </Button>



                
            </View>
        </ScrollView>  
    </KeyboardAvoidingView>

    );
   
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",

    },
    content:{
        flex: 1,
        padding: 24,
        paddingTop: 80,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent:"flex-start",
        padding:24,
        paddingTop:80,
    },
    header: {
        //alignItems: "flex-start",
        marginBottom: 24,
    },
    hello: {
        fontWeight: "bold",
        fontSize: 32,
        marginBottom: 8,
        color: "#000",
    },
    welcome: {
        fontSize: 20,
        //marginBottom: 25,
        color: "#000",
    },
    cardWrapper: {
        flex: 1,
    },
    card: {
        flex: 1,
        backgroundColor: "#e0e0e0",
        borderRadius: 28,
        padding: 17,
        //elevation: 0,
    },
    cardTitle: {
        fontWeight: "bold",
        fontSize: 22,
        marginBottom: 20,
        color: "#000",
    },
    inputContainer: {
        backgroundColor: "#d5d5d5",
        borderRadius: 30,
        //height: 50,
        marginTop:12,
        marginBottom: 12,
        overflow: "hidden",
    },
   
    inputConent:{
        height: 50,
        paddingHorizontal: 12,
        fontSize: 16,
        color: "#000"
    },
    forgot: {
        alignSelf: "flex-end",
        fontSize: 12,
        color: "#000",
        marginBottom: 12,
    },
    button:{
        marginTop: 8,
        borderRadius: 30,
        borderColor: "#000",
        //paddingVertical: 5,
    },
    buttonLabel: {
        color: "#000",
        fontWeight: "bold",
    },
    switchButton:{
        marginTop: 10,  
    }, 

}); 