import { createContext, useContext } from "react";
import { ID, Query, Permission, Role } from "react-native-appwrite";
import {
  account,
  databases,
  DATABASE_ID,
  USER_PROFILE_COLLECTION_ID,
  COMMUNITY_PROFILES_COLLECTION_ID,
  CHALLENGES_COLLECTION_ID,
  CHALLENGE_MEMBERS_COLLECTION_ID,
  CHALLENGE_INVITES_COLLECTION_ID,
  STEPS_DAILY_COLLECTION_ID,
} from "@/lib/appwrite";

// ─── Types ─────────────────────────────────────────────────────────────────────

type LeaderboardEntry = {
  userId:      string;
  name:        string;
  totalSteps:  number;
  totalPoints: number;
};

type PointsResult = {
  totalPoints:        number;
  challengePoints:    number;
  consistencyPoints:  number;
};

type CommunityContextType = {
  getGlobalLeaderboard:    (start: Date, end: Date) => Promise<LeaderboardEntry[]>;
  getChallenges:           () => Promise<any[]>;
  getMyChallenges:         () => Promise<any[]>;
  createChallenge:         (params: { title: string; type: "open" | "invite"; goalSteps: number; startDate: string; endDate: string }) => Promise<void>;
  joinChallenge:           (challengeId: string) => Promise<void>;
  getChallengeLeaderboard: (challengeId: string) => Promise<LeaderboardEntry[]>;
  inviteToChallenge:       (challengeId: string, invitedUserId: string) => Promise<void>;
  acceptInvite:            (inviteId: string) => Promise<void>;
  getInvites:              () => Promise<any[]>;
  calculateAndApplyPoints: () => Promise<PointsResult>;
  getMyPoints:             () => Promise<number>;
};

// ─── Context ───────────────────────────────────────────────────────────────────

const CommunityContext = createContext<CommunityContextType | undefined>(undefined);

export function CommunityProvider({ children }: { children: React.ReactNode }) {
  const POINTS_CHALLENGE_COMPLETE = 100;
  const POINTS_PER_STREAK_DAY     = 10;
  const STREAK_MIN_DAYS           = 3;

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const getProfiles = async () => {
    try {
      const res = await databases.listDocuments(DATABASE_ID, USER_PROFILE_COLLECTION_ID, [Query.limit(1000)]);
      return res.documents;
    } catch (e) {
      console.log("getProfiles failed:", e);
      return [];
    }
  };

  const buildNameMapAndAllowedUsers = (profiles: any[]) => {
    const namesById: Record<string, string> = {};
    const allowedUserIds = new Set<string>();

    profiles.forEach((p: any) => {
      const uid = String(p.userId || "").trim();
      if (!uid) return;
      if (String(p.role || "user").toLowerCase() === "provider") return;
      allowedUserIds.add(uid);
      const label = String(p.displayName || "").trim() || String(p.name || "").trim() || String(p.email || "").trim();
      if (label) namesById[uid] = label;
    });

    return { namesById, allowedUserIds };
  };

  const toDateOnlyKey = (iso: string) => {
    const d   = new Date(iso);
    const y   = d.getUTCFullYear();
    const m   = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const daysBetweenInclusive = (startIso: string, endIso: string) => {
    const out: string[] = [];
    const cur  = new Date(startIso); cur.setUTCHours(0, 0, 0, 0);
    const last = new Date(endIso);  last.setUTCHours(0, 0, 0, 0);
    while (cur <= last) {
      const y  = cur.getUTCFullYear();
      const mo = String(cur.getUTCMonth() + 1).padStart(2, "0");
      const d  = String(cur.getUTCDate()).padStart(2, "0");
      out.push(`${y}-${mo}-${d}`);
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return out;
  };

  const getMaxStreak = (dayKeysSorted: string[]) => {
    if (!dayKeysSorted.length) return 0;
    let best = 1;
    let cur  = 1;
    for (let i = 1; i < dayKeysSorted.length; i++) {
      const prev     = new Date(`${dayKeysSorted[i - 1]}T00:00:00Z`);
      const next     = new Date(`${dayKeysSorted[i]}T00:00:00Z`);
      const diffDays = Math.round((next.getTime() - prev.getTime()) / 86400000);
      if (diffDays === 1) { cur += 1; if (cur > best) best = cur; }
      else cur = 1;
    }
    return best;
  };

  const ensureCommunityProfile = async (userId: string) => {
    const existing = await databases.listDocuments(DATABASE_ID, COMMUNITY_PROFILES_COLLECTION_ID, [
      Query.equal("userId", userId),
      Query.limit(1),
    ]);
    if (existing.documents.length > 0) return existing.documents[0];

    const user = await account.get();
    return databases.createDocument(
      DATABASE_ID, COMMUNITY_PROFILES_COLLECTION_ID, ID.unique(),
      { userId, displayName: user.name || user.email || `User ${userId.slice(0, 6)}`, totalPoints: 0,  },
      [Permission.read(Role.users()), Permission.update(Role.user(userId)), Permission.delete(Role.user(userId))]
    );
  };

  // ─── Leaderboards ──────────────────────────────────────────────────────────

  const getGlobalLeaderboard = async (start: Date, end: Date): Promise<LeaderboardEntry[]> => {
    try {
      await account.get();
      const profiles = await getProfiles();
      const { namesById, allowedUserIds } = buildNameMapAndAllowedUsers(profiles);

      const stepTotals: Record<string, number> = {};
      allowedUserIds.forEach((uid) => { stepTotals[uid] = 0; });

      const steps = await databases.listDocuments(DATABASE_ID, STEPS_DAILY_COLLECTION_ID, [
        Query.greaterThanEqual("date", start.toISOString()),
        Query.lessThanEqual("date", end.toISOString()),
        Query.limit(1000),
      ]);
      steps.documents.forEach((s: any) => {
        const uid = String(s.userId || "").trim();
        if (!allowedUserIds.has(uid)) return;
        stepTotals[uid] = (stepTotals[uid] ?? 0) + Number(s.steps ?? 0);
      });

      const communityProfiles = await databases.listDocuments(DATABASE_ID, COMMUNITY_PROFILES_COLLECTION_ID, [Query.limit(1000)]);
      const pointsById: Record<string, number> = {};
      communityProfiles.documents.forEach((cp: any) => {
        pointsById[String(cp.userId || "").trim()] = Number(cp.totalPoints ?? 0);
      });

      return Object.entries(stepTotals)
        .map(([userId, totalSteps]) => ({
          userId,
          totalSteps,
          totalPoints: pointsById[userId] ?? 0,
          name: namesById[userId] || `User ${userId.slice(0, 6)}`,
        }))
        .sort((a, b) => b.totalPoints - a.totalPoints || b.totalSteps - a.totalSteps)
        .slice(0, 10);
    } catch (e) {
      console.log("getGlobalLeaderboard error:", e);
      return [];
    }
  };

  const getChallengeLeaderboard = async (challengeId: string): Promise<LeaderboardEntry[]> => {
    try {
      await account.get();
      const members = await databases.listDocuments(DATABASE_ID, CHALLENGE_MEMBERS_COLLECTION_ID, [
        Query.equal("challengeId", challengeId),
        Query.limit(1000),
      ]);
      const memberIds = new Set<string>(
        members.documents.map((m: any) => String(m.userId || "").trim()).filter(Boolean)
      );
      if (!memberIds.size) return [];

      const profiles = await getProfiles();
      const { namesById, allowedUserIds } = buildNameMapAndAllowedUsers(profiles);
      const allowedMembers = Array.from(memberIds).filter((uid) => allowedUserIds.has(uid));
      if (!allowedMembers.length) return [];

      const pointsByMember: Record<string, number> = {};
      members.documents.forEach((m: any) => {
        pointsByMember[String(m.userId || "").trim()] = Number(m.points ?? 0);
      });

      const challenge = await databases.getDocument(DATABASE_ID, CHALLENGES_COLLECTION_ID, challengeId);
      const totals: Record<string, number> = {};
      allowedMembers.forEach((uid) => { totals[uid] = 0; });

      const steps = await databases.listDocuments(DATABASE_ID, STEPS_DAILY_COLLECTION_ID, [
        Query.equal("userId", allowedMembers),
        Query.greaterThanEqual("date", challenge.startDate),
        Query.lessThanEqual("date", challenge.endDate),
        Query.limit(1000),
      ]);
      steps.documents.forEach((s: any) => {
        const uid = String(s.userId || "").trim();
        if (!Object.prototype.hasOwnProperty.call(totals, uid)) return;
        totals[uid] = (totals[uid] ?? 0) + Number(s.steps ?? 0);
      });

      return Object.entries(totals)
        .map(([userId, totalSteps]) => ({
          userId,
          totalSteps,
          totalPoints: pointsByMember[userId] ?? 0,
          name: namesById[userId] || `User ${userId.slice(0, 6)}`,
        }))
        .sort((a, b) => b.totalPoints - a.totalPoints || b.totalSteps - a.totalSteps);
    } catch (e) {
      console.log("getChallengeLeaderboard error:", e);
      return [];
    }
  };

  // ─── Challenges ────────────────────────────────────────────────────────────

  const getChallenges = async () => {
    try {
      const res = await databases.listDocuments(DATABASE_ID, CHALLENGES_COLLECTION_ID, [Query.limit(1000)]);
      return res.documents;
    } catch (e) {
      console.log("getChallenges error:", e);
      return [];
    }
  };

  const getMyChallenges = async () => {
    try {
      const user        = await account.get();
      const memberships = await databases.listDocuments(DATABASE_ID, CHALLENGE_MEMBERS_COLLECTION_ID, [
        Query.equal("userId", user.$id),
        Query.limit(1000),
      ]);
      const ids = memberships.documents.map((m: any) => m.challengeId);
      if (!ids.length) return [];
      const res = await databases.listDocuments(DATABASE_ID, CHALLENGES_COLLECTION_ID, [Query.equal("$id", ids)]);
      return res.documents;
    } catch (e) {
      console.log("getMyChallenges error:", e);
      return [];
    }
  };

  const createChallenge = async ({ title, type, goalSteps, startDate, endDate }: {
    title: string; type: "open" | "invite"; goalSteps: number; startDate: string; endDate: string;
  }) => {
    const user = await account.get();
    await databases.createDocument(
      DATABASE_ID, CHALLENGES_COLLECTION_ID, ID.unique(),
      { title, type, goalStep: goalSteps, startDate, endDate, status: "active", createdBy: user.$id },
      [Permission.read(Role.users()), Permission.update(Role.user(user.$id)), Permission.delete(Role.user(user.$id))]
    );
  };

  const isChallengeJoinableNow = (challenge: any) =>
    String(challenge.status || "").toLowerCase() === "active" && new Date() <= new Date(challenge.endDate);

  const isAlreadyMember = async (challengeId: string, userId: string) => {
    const res = await databases.listDocuments(DATABASE_ID, CHALLENGE_MEMBERS_COLLECTION_ID, [
      Query.equal("challengeId", challengeId),
      Query.equal("userId", userId),
      Query.limit(1),
    ]);
    return res.documents.length > 0;
  };

  const hasAcceptedInvite = async (challengeId: string, userId: string) => {
    const res = await databases.listDocuments(DATABASE_ID, CHALLENGE_INVITES_COLLECTION_ID, [
      Query.equal("challengeId", challengeId),
      Query.equal("invitedUserId", userId),
      Query.equal("status", "accepted"),
      Query.limit(1),
    ]);
    return res.documents.length > 0;
  };

  const joinChallenge = async (challengeId: string) => {
    const user      = await account.get();
    const challenge = await databases.getDocument(DATABASE_ID, CHALLENGES_COLLECTION_ID, challengeId);
    if (!isChallengeJoinableNow(challenge)) throw new Error("Challenge is not active right now");
    if (await isAlreadyMember(challengeId, user.$id)) return;
    if (String(challenge.type) === "invite") {
      if (!(await hasAcceptedInvite(challengeId, user.$id))) throw new Error("Invite-only challenge. Accept invite first.");
    }
    await databases.createDocument(
      DATABASE_ID, CHALLENGE_MEMBERS_COLLECTION_ID, ID.unique(),
      { challengeId, userId: user.$id, joinedAt: new Date().toISOString() },
      [Permission.read(Role.user(user.$id)), Permission.update(Role.user(user.$id)), Permission.delete(Role.user(user.$id))]
    );
    await calculateAndApplyPoints();
  };

  // ─── Invites ───────────────────────────────────────────────────────────────

  const inviteToChallenge = async (challengeId: string, invitedUserId: string) => {
    const user     = await account.get();
    const existing = await databases.listDocuments(DATABASE_ID, CHALLENGE_INVITES_COLLECTION_ID, [
      Query.equal("challengeId", challengeId),
      Query.equal("invitedUserId", invitedUserId),
      Query.equal("status", "pending"),
      Query.limit(1),
    ]);
    if (existing.documents.length > 0) return;
    await databases.createDocument(
      DATABASE_ID, CHALLENGE_INVITES_COLLECTION_ID, ID.unique(),
      { challengeId, invitedUserId, invitedBy: user.$id, status: "pending", sentAt: new Date().toISOString() },
      [
        Permission.read(Role.user(invitedUserId)),
        Permission.read(Role.user(user.$id)),
        Permission.update(Role.user(invitedUserId)),
        Permission.delete(Role.user(user.$id)),
      ]
    );
  };

  const acceptInvite = async (inviteId: string) => {
    const user   = await account.get();
    const invite = await databases.getDocument(DATABASE_ID, CHALLENGE_INVITES_COLLECTION_ID, inviteId);
    if (invite.invitedUserId !== user.$id) throw new Error("Not allowed to accept this invite");
    if (invite.status !== "accepted") {
      await databases.updateDocument(DATABASE_ID, CHALLENGE_INVITES_COLLECTION_ID, inviteId, {
        status: "accepted", acceptedAt: new Date().toISOString(),
      });
    }
    await joinChallenge(invite.challengeId);
  };

  const getInvites = async () => {
    try {
      const user = await account.get();
      const res  = await databases.listDocuments(DATABASE_ID, CHALLENGE_INVITES_COLLECTION_ID, [
        Query.equal("invitedUserId", user.$id),
        Query.equal("status", "pending"),
        Query.limit(1000),
      ]);
      return res.documents;
    } catch (e) {
      console.log("getInvites error:", e);
      return [];
    }
  };

  // ─── Points ────────────────────────────────────────────────────────────────

  const getMyPoints = async (): Promise<number> => {
    try {
      const user = await account.get();
      const res  = await databases.listDocuments(DATABASE_ID, COMMUNITY_PROFILES_COLLECTION_ID, [
        Query.equal("userId", user.$id),
        Query.limit(1),
      ]);
      return Number(res.documents[0]?.totalPoints ?? 0);
    } catch (e) {
      return 0;
    }
  };

  const calculateAndApplyPoints = async (): Promise<PointsResult> => {
    const user        = await account.get();
    const memberships = await databases.listDocuments(DATABASE_ID, CHALLENGE_MEMBERS_COLLECTION_ID, [
      Query.equal("userId", user.$id),
      Query.limit(1000),
    ]);

    if (!memberships.documents.length) {
      const profile = await ensureCommunityProfile(user.$id);
      await databases.updateDocument(DATABASE_ID, COMMUNITY_PROFILES_COLLECTION_ID, profile.$id, { totalPoints: 0 });
      return { totalPoints: 0, challengePoints: 0, consistencyPoints: 0 };
    }

    const challengeIds  = memberships.documents.map((m: any) => m.challengeId);
    const challengesRes = await databases.listDocuments(DATABASE_ID, CHALLENGES_COLLECTION_ID, [
      Query.equal("$id", challengeIds),
      Query.limit(1000),
    ]);
    const challengeById: Record<string, any> = {};
    challengesRes.documents.forEach((c: any) => { challengeById[c.$id] = c; });

    const minStart = challengesRes.documents.map((c: any) => new Date(c.startDate).getTime()).reduce((a, b) => Math.min(a, b), Date.now());
    const maxEnd   = challengesRes.documents.map((c: any) => new Date(c.endDate).getTime()).reduce((a, b) => Math.max(a, b), 0);

    const allSteps = await databases.listDocuments(DATABASE_ID, STEPS_DAILY_COLLECTION_ID, [
      Query.equal("userId", user.$id),
      Query.greaterThanEqual("date", new Date(minStart).toISOString()),
      Query.lessThanEqual("date", new Date(maxEnd).toISOString()),
      Query.limit(5000),
    ]);

    const stepsByDay: Record<string, number> = {};
    allSteps.documents.forEach((s: any) => {
      const key = toDateOnlyKey(s.date);
      stepsByDay[key] = (stepsByDay[key] ?? 0) + Number(s.steps ?? 0);
    });

    let challengePoints   = 0;
    let consistencyPoints = 0;

    for (const m of memberships.documents as any[]) {
      const c = challengeById[m.challengeId];
      if (!c) continue;

      const rangeDays          = daysBetweenInclusive(c.startDate, c.endDate);
      let challengeTotalSteps  = 0;
      const loggedDays: string[] = [];

      rangeDays.forEach((dayKey) => {
        const steps = stepsByDay[dayKey] ?? 0;
        challengeTotalSteps += steps;
        if (steps > 0) loggedDays.push(dayKey);
      });

      const goal             = Number(c.goalStep ?? c.goalSteps ?? 0);
      const completed        = goal > 0 && challengeTotalSteps >= goal;
      const earnedChallenge  = completed ? POINTS_CHALLENGE_COMPLETE : 0;

      const uniqueLoggedDays  = Array.from(new Set(loggedDays)).sort();
      const maxStreak         = getMaxStreak(uniqueLoggedDays);
      const earnedConsistency = maxStreak >= STREAK_MIN_DAYS ? maxStreak * POINTS_PER_STREAK_DAY : 0;
      const earnedTotal       = earnedChallenge + earnedConsistency;

      challengePoints   += earnedChallenge;
      consistencyPoints += earnedConsistency;

      await databases.updateDocument(DATABASE_ID, CHALLENGE_MEMBERS_COLLECTION_ID, m.$id, {
        points:             earnedTotal,
        challengePoints:    earnedChallenge,
        consistencyPoints:  earnedConsistency,
        completed,
        totalSteps:         challengeTotalSteps,
        maxStreakDays:      maxStreak,
        pointsUpdatedAt:    new Date().toISOString(),
      });
    }

    const totalPoints = challengePoints + consistencyPoints;
    const profile     = await ensureCommunityProfile(user.$id);
    await databases.updateDocument(DATABASE_ID, COMMUNITY_PROFILES_COLLECTION_ID, profile.$id, {
      totalPoints,
      pointsUpdatedAt: new Date().toISOString(),
    });

    return { totalPoints, challengePoints, consistencyPoints };
  };

  // ─── Provider ──────────────────────────────────────────────────────────────

  return (
    <CommunityContext.Provider value={{
      getGlobalLeaderboard,
      getChallenges,
      getMyChallenges,
      createChallenge,
      joinChallenge,
      getChallengeLeaderboard,
      inviteToChallenge,
      acceptInvite,
      getInvites,
      calculateAndApplyPoints,
      getMyPoints,
    }}>
      {children}
    </CommunityContext.Provider>
  );
}

export function useCommunity() {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error("useCommunity must be used inside CommunityProvider");
  return ctx;
}