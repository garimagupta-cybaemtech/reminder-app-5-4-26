import auth from "@react-native-firebase/auth";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import type { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";

import type { User } from "@/types";

const USERS_COLLECTION = "users";
const COLOR_PALETTE = ["#1a73e8", "#e8710a", "#7627bb", "#16a765", "#d93025", "#0b8043"];

function pickColor(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i += 1) {
    hash = (hash * 31 + uid.charCodeAt(i)) | 0;
  }
  return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length];
}

function toUsername(email: string, uid: string): string {
  const local = email.split("@")[0]?.trim().toLowerCase();
  return local || `user-${uid.slice(0, 6)}`;
}

function toAppUser(
  firebaseUser: FirebaseAuthTypes.User,
  profile?: FirebaseFirestoreTypes.DocumentData,
): User {
  const email = (firebaseUser.email ?? "").trim().toLowerCase();
  const nameFromProfile = String(profile?.name ?? "").trim();
  const displayName = nameFromProfile || firebaseUser.displayName?.trim() || email || "User";
  const color = String(profile?.color ?? "").trim() || pickColor(firebaseUser.uid);
  const orgIdRaw = String(profile?.orgId ?? "").trim();
  const usernameFromProfile = String(profile?.username ?? "").trim().toLowerCase();

  return {
    id: firebaseUser.uid,
    userId: firebaseUser.uid,
    email,
    orgId: orgIdRaw || null,
    username: usernameFromProfile || toUsername(email, firebaseUser.uid),
    password: "",
    name: displayName,
    color,
  };
}

export async function signupWithEmail(params: {
  name: string;
  email: string;
  password: string;
}): Promise<User> {
  const email = params.email.trim().toLowerCase();
  const name = params.name.trim();
  const credential = await auth().createUserWithEmailAndPassword(email, params.password);
  if (name) {
    await credential.user.updateProfile({ displayName: name });
  }
  await upsertUserProfile(credential.user.uid, {
    name: name || email,
    email,
    username: toUsername(email, credential.user.uid),
    orgId: null,
    color: pickColor(credential.user.uid),
  });
  const profile = await getUserProfile(credential.user.uid);
  return toAppUser(credential.user, profile ?? undefined);
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const normalized = email.trim().toLowerCase();
  const credential = await auth().signInWithEmailAndPassword(normalized, password);
  const profile = await getUserProfile(credential.user.uid);
  return toAppUser(credential.user, profile ?? undefined);
}

export async function logoutFromFirebase(): Promise<void> {
  await auth().signOut();
}

export function onAuthChanged(
  listener: (user: User | null) => void,
  onError?: (error: Error) => void,
): () => void {
  return auth().onAuthStateChanged(async (firebaseUser) => {
    if (!firebaseUser) {
      listener(null);
      return;
    }
    try {
      const profile = await getUserProfile(firebaseUser.uid);
      if (!profile) {
        await upsertUserProfile(firebaseUser.uid, {
          name: firebaseUser.displayName?.trim() || firebaseUser.email || "User",
          email: (firebaseUser.email ?? "").trim().toLowerCase(),
          username: toUsername(firebaseUser.email ?? "", firebaseUser.uid),
          orgId: null,
          color: pickColor(firebaseUser.uid),
        });
      }
      const latestProfile = profile ?? (await getUserProfile(firebaseUser.uid));
      listener(toAppUser(firebaseUser, latestProfile ?? undefined));
    } catch (error) {
      if (onError) onError(error as Error);
      listener(toAppUser(firebaseUser));
    }
  });
}

export async function getUserProfile(uid: string): Promise<FirebaseFirestoreTypes.DocumentData | null> {
  const snap = await firestore().collection(USERS_COLLECTION).doc(uid).get();
  if (!snap.exists) return null;
  return snap.data() ?? null;
}

export async function upsertUserProfile(
  uid: string,
  patch: {
    name?: string;
    email?: string;
    username?: string;
    orgId?: string | null;
    color?: string;
  },
): Promise<void> {
  await firestore().collection(USERS_COLLECTION).doc(uid).set(
    {
      ...patch,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export function subscribeAllUsers(
  onChange: (users: User[]) => void,
  onError?: (error: Error) => void,
): () => void {
  return firestore()
    .collection(USERS_COLLECTION)
    .onSnapshot(
      (snap) => {
        const users: User[] = snap.docs.map((docSnap) => {
          const data = docSnap.data();
          const email = String(data.email ?? "").trim().toLowerCase();
          const uid = docSnap.id;
          const name = String(data.name ?? "").trim() || email || "User";
          const username = String(data.username ?? "").trim().toLowerCase() || toUsername(email, uid);
          const orgIdRaw = String(data.orgId ?? "").trim();
          const color = String(data.color ?? "").trim() || pickColor(uid);
          return {
            id: uid,
            userId: uid,
            email,
            orgId: orgIdRaw || null,
            username,
            password: "",
            name,
            color,
          };
        });
        onChange(users);
      },
      (error) => {
        if (onError) onError(error as Error);
      },
    );
}
