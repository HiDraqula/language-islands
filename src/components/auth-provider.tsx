"use client";

import { GoogleAuthProvider, User, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { firebaseAuth, firestore } from "@/lib/firebase";
import { applyCloudState, CloudState, LOCAL_DATA_CHANGED, readCloudState } from "@/lib/local-data";
import { useToast } from "./ui-feedback";

type AuthValue = { user: User | null; loading: boolean; syncing: boolean; lastSyncedAt: number | null; syncNow: () => Promise<boolean>; signIn: () => Promise<void>; signOutUser: () => Promise<void> };
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const applyingCloud = useRef(false);
  const stateRef = user ? doc(firestore, "users", user.uid, "app", "state") : null;
  const toast = useToast();

  useEffect(() => onAuthStateChanged(firebaseAuth, (nextUser) => { setUser(nextUser); setLoading(false); }), []);

  useEffect(() => {
    if (!user) return;
    const stateRef = doc(firestore, "users", user.uid, "app", "state");
    let initialized = false;
    const unsubscribe = onSnapshot(stateRef, async (snapshot) => {
      try {
        if (!snapshot.exists()) {
          setSyncing(true);
          await setDoc(stateRef, readCloudState());
          setSyncing(false);
          setLastSyncedAt(Date.now());
          initialized = true;
          toast("Your local islands are now synced.", "success");
          return;
        }
        const cloud = snapshot.data() as CloudState;
        if (!initialized) {
          const local = readCloudState();
          const cloudIds = new Set((cloud.islands || []).map((island) => island.id));
          const merged: CloudState = {
            islands: [...(cloud.islands || []), ...local.islands.filter((island) => !cloudIds.has(island.id))],
            phrases: { ...local.phrases, ...(cloud.phrases || {}) },
            preferences: Object.keys(cloud.preferences || {}).length ? cloud.preferences : local.preferences,
            version: 2,
            updatedAt: Date.now(),
          };
          initialized = true;
          applyingCloud.current = true;
          applyCloudState(merged);
          applyingCloud.current = false;
          await setDoc(stateRef, merged);
          setLastSyncedAt(Date.now());
          toast("Cloud and local islands were merged.", "success");
        } else {
          applyingCloud.current = true;
          applyCloudState(cloud);
          setLastSyncedAt(cloud.updatedAt || Date.now());
          applyingCloud.current = false;
        }
      } catch (error) {
        setSyncing(false);
        toast(error instanceof Error ? error.message : "Firebase sync could not start.", "error");
      }
    }, () => toast("Firestore denied access. Check the app's Firestore rules.", "error"));

    let timer: ReturnType<typeof setTimeout> | undefined;
    const upload = () => {
      if (applyingCloud.current || !initialized) return;
      clearTimeout(timer);
      setSyncing(true);
      timer = setTimeout(async () => {
        try { await setDoc(stateRef, readCloudState()); setLastSyncedAt(Date.now()); }
        catch { toast("The latest change could not sync to Firebase.", "error"); }
        finally { setSyncing(false); }
      }, 600);
    };
    window.addEventListener(LOCAL_DATA_CHANGED, upload);
    return () => { unsubscribe(); clearTimeout(timer); window.removeEventListener(LOCAL_DATA_CHANGED, upload); };
  }, [toast, user]);

  const syncNow = useCallback(async () => {
    if (!stateRef) { toast("Sign in with Google before syncing settings.", "error"); return false; }
    setSyncing(true);
    try {
      await setDoc(stateRef, readCloudState());
      setLastSyncedAt(Date.now());
      toast("Islands and settings are synced.", "success");
      return true;
    } catch {
      toast("Settings could not sync to Firebase.", "error");
      return false;
    } finally { setSyncing(false); }
  }, [stateRef, toast]);

  const signIn = useCallback(async () => {
    try { await signInWithPopup(firebaseAuth, new GoogleAuthProvider()); }
    catch (error) { toast(error instanceof Error ? error.message : "Google sign-in could not open.", "error"); }
  }, [toast]);
  const signOutUser = useCallback(async () => { await signOut(firebaseAuth); toast("Signed out. Local data remains on this device.", "info"); }, [toast]);

  return <AuthContext.Provider value={{ user, loading, syncing, lastSyncedAt, syncNow, signIn, signOutUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
