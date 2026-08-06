import { User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";

export type SyncedApiCredentials = {
  deeplKey: string;
  elevenLabsKey: string;
  azureSpeechKey: string;
};

type EncryptedCredentials = {
  ciphertext: string;
  iv: string;
  version: number;
};

async function callSecretApi(user: User, body: Record<string, unknown>) {
  const idToken = await user.getIdToken();
  const response = await fetch("/api/config-secrets", {
    method: "POST",
    headers: { "Authorization": `Bearer ${idToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Credential sync failed.");
  return result;
}

export async function uploadApiCredentials(user: User, credentials: SyncedApiCredentials) {
  const encrypted = await callSecretApi(user, { action: "encrypt", credentials }) as EncryptedCredentials;
  await setDoc(doc(firestore, "users", user.uid, "private", "config"), {
    encryptedCredentials: encrypted,
    updatedAt: Date.now(),
  });
}

export async function downloadApiCredentials(user: User): Promise<SyncedApiCredentials | null> {
  const snapshot = await getDoc(doc(firestore, "users", user.uid, "private", "config"));
  if (!snapshot.exists()) return null;
  const encrypted = snapshot.data().encryptedCredentials as EncryptedCredentials | undefined;
  if (!encrypted) return null;
  const result = await callSecretApi(user, { action: "decrypt", encrypted });
  return result.credentials as SyncedApiCredentials;
}
