import { useAuth } from "@/lib/auth-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {Image,KeyboardAvoidingView,Platform,ScrollView,StyleSheet,Text,TextInput,TouchableOpacity,View,} from "react-native";


export default function AuthScreen() {
    const [isSignUp,setIsSignUp] = useState(false);
    const [email,setEmail]= useState("");
    const [password,setPassword] = useState("");
    const [confirmPassword,setConfirmPassword]  = useState("");
    const [name,setName]= useState("");
    const [error, setError] = useState<string | null>(null);
    const [showPassword,setShowPassword] = useState(false);
    const [showConfirm,setShowConfirm]= useState(false);
    const router = useRouter();
    const { signIn, signUp } = useAuth();
    
    const handleAuth = async () => {
        if (!email || !password) { setError("Please fill in all fields"); return; }
        if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
        if (isSignUp && password !== confirmPassword) { setError("Passwords don't match."); return; }
        setError(null);

    if (isSignUp) {
        const err = await signUp(email, password);
        if (err) { setError(err); return; }
    } else {
        const err = await signIn(email, password);
        if (err) { setError(err); return; }
        router.replace("/");
    }
};
return (
    <LinearGradient colors={[C.cream, "#FFF0F3", "#FDE8ED"]} style={s.screen}>
        <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.kav}
        >
            <ScrollView
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            >
                <Text style={s.title}> Hi welcome to BLOOPY!!!</Text>

            {/* ── Big card ── */}
                <LinearGradient colors={[C.blush, "#FDE8ED"]} style={s.card}>
            {/* Tab switcher */}
            <View style={s.tabRow}>
                <TouchableOpacity
                onPress={() => { setIsSignUp(false); setError(null); }}
                style={[s.tab, !isSignUp && s.tabActive]}
                >
                    <Text style={[s.tabText, !isSignUp && s.tabTextActive]}>Sign In</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                    onPress={() => { setIsSignUp(true); setError(null); }}
                    style={[s.tab, isSignUp && s.tabActive]}
                    >
                        <Text style={[s.tabText, isSignUp && s.tabTextActive]}>Sign Up</Text>
                        </TouchableOpacity>
                        </View>
                        
                        {/* Greeting */}
                        <Text style={s.cardTitle}>
                            {isSignUp ? "Create your account " : "Welcome back "}
                            </Text>
                            <Text style={s.cardSubtitle}>
                                {isSignUp
                                ? "Join Bloopy and start tracking your health"
                                : "Sign in to continue your health journey"}
                            </Text>
                        {/* Name (sign up only) */}
                        {isSignUp && (
                            <View style={s.fieldWrap}>
                            <Text style={s.fieldLabel}>Name</Text>
                            <View style={s.inputRow}>
                                <TextInput
                                style={s.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Your name"
                                placeholderTextColor={C.textLight}
                                autoCapitalize="words"
                                />
                                </View>
                            </View>
                        )}
                        {/* Email */}
                        <View style={s.fieldWrap}>
                        <Text style={s.fieldLabel}>Email</Text>
                        <View style={s.inputRow}>
                        <TextInput
                            style={s.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="email@example.com"
                            placeholderTextColor={C.textLight}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            />
                        </View>
                    </View>
                    
                {/* Password */}
                    <View style={s.fieldWrap}>
                        <Text style={s.fieldLabel}>Password</Text>
                        <View style={s.inputRow}>
                            <TextInput
                            style={[s.input, { flex: 1 }]}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="••••••••"
                            placeholderTextColor={C.textLight}
                            secureTextEntry={!showPassword}
                            autoComplete="off"
                            textContentType="oneTimeCode"
                            />
                            <TouchableOpacity onPress={() => setShowPassword((p) => !p)} style={s.eyeBtn}>
                                <Image
                                source={showPassword
                                    ? require("../assets/images/eye-open.png")
                                    : require("../assets/images/eye-close.png")
                                }
                                style={s.eyeIcon}
                                /> 
                            </TouchableOpacity>
                        </View>
                    </View>
                        {/* Confirm password (sign up only) */}
                            {isSignUp && (
                                <View style={s.fieldWrap}>
                                    <Text style={s.fieldLabel}>Confirm Password</Text>
                                    <View style={s.inputRow}>
                                        <TextInput
                                        style={[s.input, { flex: 1 }]}
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        placeholder="••••••••"
                                        placeholderTextColor={C.textLight}
                                        secureTextEntry={!showConfirm}
                                        autoComplete="off"
                                        textContentType="oneTimeCode"
                                    />
                                    <TouchableOpacity onPress={() => setShowConfirm((p) => !p)} style={s.eyeBtn}>
                                        <Image
                                        source={showConfirm
                                        ? require("../assets/images/eye-open.png")
                                        : require("../assets/images/eye-close.png")
                                    }
                                    style={s.eyeIcon}
                                    />
                                    </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        {/* Forgot password (sign in only) */}
                            {!isSignUp && (
                                <TouchableOpacity
                                onPress={() => alert("Forgot password?")}
                                style={s.forgotWrap}
                                >
                                    <Text style={s.forgotText}>Forgot password?</Text>
                                </TouchableOpacity>
                                )}
                            {/* Error */}
                                {error && (
                                    <View style={s.errorBox}>
                                        <Text style={s.errorText}>⚠️  {error}</Text>
                                    </View>
                                    )}
                            {/* Submit button */}
                                <TouchableOpacity onPress={handleAuth} style={s.submitBtn} activeOpacity={0.85}>
                                    <LinearGradient colors={[C.rose, C.roseDark]} style={s.submitBtnInner}>
                                        <Text style={s.submitBtnText}>
                                            {isSignUp ? "Create Account" : "Sign In"}
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            
                            {/* Switch mode */}
                                <TouchableOpacity
                                onPress={() => { setIsSignUp((p) => !p); setError(null); }}
                                style={s.switchWrap}
                                >
                                    <Text style={s.switchText}>
                                        {isSignUp
                                        ? "Already have an account? "
                                        : "Don't have an account? "}
                                        <Text style={s.switchLink}>
                                            {isSignUp ? "Sign In" : "Sign Up"}
                                        </Text>
                                    </Text>
                                </TouchableOpacity>
                        </LinearGradient>
                    <View style={{ height: 40 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    </LinearGradient>);
}

// ─── Design tokens ────────────────────────────
const C = {
    blush:"#FADADD", roseLight:"#F9C5C9", rose:"#E8929A",roseDark:"#C45C6A",
    lavender:  "#EDD9F5",lavDark:"#B07CC6", peach:"#FAE5D3",mint:"#D4F0E8",
    mintDark:"#6BBFA3", cream:"#FFF8F5", white:"#FFFFFF",textDark:"#3D2030",
    textMid:"#7A4F5A", textLight:"#B08090", border:"#F0D5DA",
};

const s = StyleSheet.create({
    screen: { flex: 1 }, kav:    { flex: 1 },
    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 80, paddingBottom: 24 },

  // Card — big rounded card like the original, but in app palette
    card: {
        borderRadius: 28,
        padding: 24,
        paddingBottom: 40,
        minHeight: 460,
        marginTop: 100,
},

  // Tab switcher — white pills on the blush background
    tabRow:         { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 16, padding: 4, marginBottom: 24 },
    tab:            { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center" },
    tabActive:      { backgroundColor: C.white,
    shadowColor: C.rose, shadowOpacity: 0.15, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    tabText:        { fontSize: 14, fontWeight: "700", color: C.textMid },
    tabTextActive:  { color: C.roseDark },
    title:{ fontSize:40, fontWeight:"900", color: C.textDark,marginTop:20, },

  // Card title
    cardTitle:    { fontSize: 20, fontWeight: "900", color: C.textDark, marginBottom: 4 },
    cardSubtitle: { fontSize: 13, color: C.textLight, fontWeight: "600", marginBottom: 20, lineHeight: 18 },

  // Fields
    fieldWrap:  { marginBottom: 14 },
    fieldLabel: { fontSize: 11, fontWeight: "700", color: C.textLight,
    textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 },
    inputRow:   { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 14, paddingHorizontal: 14, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.9)" },
    inputIcon:  { fontSize: 16, marginRight: 8 },
    input:{ flex: 1, paddingVertical: 13, fontSize: 15, color: C.textDark },
    eyeBtn: { padding: 4 },
    eyeIcon: { width: 24, height: 16, tintColor: "#B08090" },

  // Forgot
    forgotWrap: { alignSelf: "flex-end", marginBottom: 16, marginTop: -4 },
    forgotText: { fontSize: 12, fontWeight: "700", color: C.rose },

  // Error
    errorBox: { backgroundColor: "#FFF0F0", borderRadius: 12, padding: 12,
    marginBottom: 14, borderWidth: 1, borderColor: "#FFCDD2" },
    errorText: { fontSize: 13, fontWeight: "600", color: "#C62828" },

  // Submit
    submitBtn: { borderRadius: 16, overflow: "hidden", marginBottom: 16 },
    submitBtnInner: { paddingVertical: 15, alignItems: "center" },
    submitBtnText:{ fontSize: 16, fontWeight: "900", color: C.white, letterSpacing: 0.3 },

  // Switch mode
    switchWrap: { alignItems: "center", paddingVertical: 4 },
    switchText: { fontSize: 13, fontWeight: "600", color: C.textLight },
    switchLink: { color: C.roseDark, fontWeight: "800" },
});