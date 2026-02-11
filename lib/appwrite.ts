import { Account, Client, Databases } from 'react-native-appwrite';

export const client = new Client()
.setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!)
.setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!)
.setPlatform(process.env.EXPO_PUBLIC_APPWRITE_PLATFORM!)

export const databases = new Databases(client);
export const account = new Account(client);

export const DATABASE_ID = process.env.EXPO_PUBLIC_DB_ID!;
export const HEALTHLOG_COLLECTION_ID = 
process.env.EXPO_PUBLIC_DAILYHEALTH_COLLECTION_ID!;

export const STEPS_DAILY_COLLECTION_ID =
process.env.EXPO_PUBLIC_STEPS_DAILY_COLLECTION_ID!;

export const STEPS_SUMMARY_COLLECTION_ID =
process.env.EXPO_PUBLIC_STEPS_SUMMARY_COLLECTION_ID!;


