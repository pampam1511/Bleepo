import React, { createContext, useContext } from "react";
import { ID, Permission, Query, Role } from "react-native-appwrite";
import { account, databases,DATABASE_ID, USER_PROFILE_COLLECTION_ID, PROVIDER_ACCESS, SHARED_REPORTS  } from "@/lib/appwrite";


type ReportRange = "WEEKLY" | "MONTHLY" | "YEARLY";

type PublishReportInput = {
  range:       ReportRange;
  periodStart: string;
  periodEnd:   string;
  reportJson:  Record<string, any>; // should include steps, calories, symptoms, period data etc.
};

type ProviderReportContextType = {
  listProviders:                      () => Promise<any[]>;
  getMyProviders:                     () => Promise<any[]>;
  grantAccess:                        (providerId: string) => Promise<void>;
  revokeAccess:                       (providerId: string) => Promise<void>;
  publishReportForActiveProviders:    (input: PublishReportInput) => Promise<void>;
  getReportsForProvider:              () => Promise<any[]>;
};

const ProviderReportContext = createContext<ProviderReportContextType | undefined>(undefined);

export function ProviderReportProvider({ children }: { children: React.ReactNode }) {

  // ── List all provider accounts so patients can choose who to grant access to
  const listProviders = async () => {
    const res = await databases.listDocuments(DATABASE_ID, USER_PROFILE_COLLECTION_ID, [
      Query.equal("role", "provider"),
    ]);
    return res.documents;
  };

  // ── Get providers the current patient has granted access to
  const getMyProviders = async () => {
    const user = await account.get();
    const res  = await databases.listDocuments(DATABASE_ID, PROVIDER_ACCESS, [
      Query.equal("patientId", user.$id),
      Query.equal("status",    "active"),
    ]);
    return res.documents;
  };

  // ── Grant a provider access to the patient's reports
  const grantAccess = async (providerId: string) => {
    const user = await account.get();

    const existing = await databases.listDocuments(DATABASE_ID, PROVIDER_ACCESS, [
      Query.equal("patientId",  user.$id),
      Query.equal("providerId", providerId),
    ]);

    const payload = { patientId: user.$id, providerId, status: "active" };

    if (existing.documents.length > 0) {
      await databases.updateDocument(DATABASE_ID, PROVIDER_ACCESS, existing.documents[0].$id, payload);
      return;
    }

    await databases.createDocument(
      DATABASE_ID, PROVIDER_ACCESS, ID.unique(), payload,
      [
        Permission.read(Role.user(user.$id)),
        Permission.read(Role.user(providerId)),    // ✅ FIX: provider can read their own access record
        Permission.update(Role.user(user.$id)),
        Permission.delete(Role.user(user.$id)),
      ]
    );
  };

  // ── Revoke access and delete all shared reports for that provider
  const revokeAccess = async (providerId: string) => {
    const user = await account.get();

    const links = await databases.listDocuments(DATABASE_ID, PROVIDER_ACCESS, [
      Query.equal("patientId",  user.$id),
      Query.equal("providerId", providerId),
    ]);
    for (const doc of links.documents) {
      await databases.updateDocument(DATABASE_ID, PROVIDER_ACCESS, doc.$id, { status: "revoked" });
    }

    const shared = await databases.listDocuments(DATABASE_ID, SHARED_REPORTS, [
      Query.equal("patientId",  user.$id),
      Query.equal("providerId", providerId),
    ]);
    for (const report of shared.documents) {
      await databases.deleteDocument(DATABASE_ID, SHARED_REPORTS, report.$id);
    }
  };

  // ── Publish a report to all currently active providers
  // reportJson should include ALL health data: steps, calories, symptoms, period logs etc.
  const publishReportForActiveProviders = async (input: PublishReportInput) => {
    const user = await account.get();

    const me = await databases.listDocuments(DATABASE_ID, USER_PROFILE_COLLECTION_ID, [
      Query.equal("userId", user.$id),
    ]);
    const patientName = me.documents[0]?.displayName ?? user.name ?? "Patient";

    const activeProviders = await databases.listDocuments(DATABASE_ID, PROVIDER_ACCESS, [
      Query.equal("patientId", user.$id),
      Query.equal("status",    "active"),
    ]);

    for (const link of activeProviders.documents) {
      const providerId = String(link.providerId || "").trim();
      if (!providerId || providerId.length < 10) {
        console.log("invalid providerId in provider-access row:", link.$id, link.providerId);
        continue;
      }

      await databases.createDocument(
        DATABASE_ID, SHARED_REPORTS, ID.unique(),
        {
          patientId:   user.$id,
          patientName,
          providerId,
          range:       input.range,
          periodStart: input.periodStart,
          periodEnd:   input.periodEnd,
          reportJson:  JSON.stringify(input.reportJson),
          createdAt:   new Date().toISOString(),
        },
        [
          Permission.read(Role.user(user.$id)),       // patient can read their own report
          Permission.read(Role.user(providerId)),      // ✅ FIX: provider can read reports shared with them
          Permission.update(Role.user(user.$id)),
          Permission.delete(Role.user(user.$id)),
        ]
      );
    }
  };

  // ── Provider fetches all reports shared with them
  const getReportsForProvider = async () => {
    const user = await account.get();
    const res  = await databases.listDocuments(DATABASE_ID, SHARED_REPORTS, [
      Query.equal("providerId", user.$id),
      Query.orderDesc("$createdAt"),
    ]);
    return res.documents.map((d) => ({
      ...d,
      parsed: d.reportJson ? JSON.parse(d.reportJson) : null,
    }));
  };

  return (
    <ProviderReportContext.Provider value={{
      listProviders,
      getMyProviders,
      grantAccess,
      revokeAccess,
      publishReportForActiveProviders,
      getReportsForProvider,
    }}>
      {children}
    </ProviderReportContext.Provider>
  );
}

export function useProviderReport() {
  const ctx = useContext(ProviderReportContext);
  if (!ctx) throw new Error("useProviderReport must be used inside ProviderReportProvider");
  return ctx;
}