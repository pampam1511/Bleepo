import { useAuth } from "@/lib/auth-context";
import { Text, View } from "react-native";
import { Button } from "react-native-paper";

export default function profileScreen() {
    const {signOut} = useAuth()
    return (<View>
        
        <Text> hiii this is the profile page</Text>
        <Button mode="text" onPress={signOut} icon={"logout"}>Sign out</Button>
    </View>
    );

}