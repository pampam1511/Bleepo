import { createContext, useContext } from 'react';
import {ID, Query, Permission, Role } from 'react-native-appwrite';
import { databases, account } from './appwrite';

const DB_ID = "697ceba5002b026d89f2";
const USER_PROFILE = "user_profile";

type ProfileContextType = {
    getUserProfile: () => Promise<any | null>;
    saveUserProfile: (params: { 
        heightCm: number;
        weightKg: number ;
        weightGoalKg: number;
    }) => Promise<void>;
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children}: { children: React.ReactNode}) {
    const getUserProfile = async () => {
        const user = await account.get();
        const res = await databases.listDocuments(DB_ID, USER_PROFILE, [ 
            Query.equal('userId', user.$id),
        ]);
        return res.documents[0] ?? null;
    };

    const saveUserProfile = async ({
        heightCm,
        weightKg,
        weightGoalKg,
    }: {
        heightCm: number;
        weightKg: number;
        weightGoalKg: number;
    }) =>{ 
        const user = await account.get();
        
        const existing = await databases.listDocuments(DB_ID, USER_PROFILE, [ 
            Query.equal('userId', user.$id),
        ]);

        const payload = {
            userId: user.$id,
            heightCm,
            weightKg,
            weightGoalKg,
            updatedAt: new Date().toISOString(),
        };

        if (existing.documents.length > 0) { 
            await databases.updateDocument(DB_ID, USER_PROFILE, existing.documents[0].$id, payload); 
        } else {
            await databases.createDocument(DB_ID, USER_PROFILE, ID.unique(), payload, [
                Permission.read(Role.user(user.$id)),
                Permission.update(Role.user(user.$id)),
                Permission.delete(Role.user(user.$id)),
            ]);
        }
    }
    return (
        <ProfileContext.Provider value={{ getUserProfile, saveUserProfile }}>
            {children}
        </ProfileContext.Provider>
        );
    };

    export function useProfile() {
        const context = useContext(ProfileContext);
        if (!context) {
            throw new Error("useProfile must be used inside ProfileProvider");
        }
        return context;
    }

    
    
