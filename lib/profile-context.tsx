import { createContext, useContext } from 'react';
import {ID, Query, Permission, Role } from 'react-native-appwrite';
import { databases, account, DATABASE_ID, USER_PROFILE_COLLECTION_ID } from './appwrite';



type ProfileContextType = {
    getUserProfile: () => Promise<any | null>;
    saveUserProfile: (params: { 
        heightCm: number;
        weightKg: number ;
        weightGoalKg: number;
        dataSharing: boolean;
    }) => Promise<void>;
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children}: { children: React.ReactNode}) {
    const getUserProfile = async () => {
        const user = await account.get();
        const res = await databases.listDocuments(DATABASE_ID, USER_PROFILE_COLLECTION_ID, [ 
            Query.equal('userId', user.$id),
        ]);
        return res.documents[0] ?? null;
    };

    const saveUserProfile = async ({
        heightCm,
        weightKg,
        weightGoalKg,
        dataSharing,
    }: {
        heightCm: number;
        weightKg: number;
        weightGoalKg: number;
        dataSharing: boolean;
    }) =>{ 
        const user = await account.get();
        
        const existing = await databases.listDocuments(DATABASE_ID, USER_PROFILE_COLLECTION_ID, [ 
            Query.equal('userId', user.$id),
        ]);

        const payload = {
            userId: user.$id,
            heightCm,
            weightKg,
            weightGoalKg,
            dataSharing,
            updatedAt: new Date().toISOString(),
        };

        if (existing.documents.length > 0) { 
            await databases.updateDocument(DATABASE_ID, USER_PROFILE_COLLECTION_ID, existing.documents[0].$id, payload); 
        } else {
            await databases.createDocument(DATABASE_ID, USER_PROFILE_COLLECTION_ID, ID.unique(), payload, [
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

    
