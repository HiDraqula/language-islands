import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const runtime = "nodejs";

type Credentials = { deeplKey: string; elevenLabsKey: string; azureSpeechKey: string };
type EncryptedCredentials = { ciphertext: string; iv: string; version: number };

function encryptionKey() {
  const secret = process.env.CONFIG_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) throw new Error("CONFIG_ENCRYPTION_KEY is not configured.");
  return createHash("sha256").update(secret).digest();
}

async function authenticatedUid(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new Error("Authentication is required.");
  const response = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=AIzaSyDXLszI3freBo7U9XZC3WMojuX7rIGLsQk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: token }),
    cache: "no-store",
  });
  const data = await response.json();
  const uid = data.users?.[0]?.localId;
  if (!response.ok || typeof uid !== "string") throw new Error("Authentication token is invalid.");
  return uid;
}

function validCredentials(value: unknown): value is Credentials {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return ["deeplKey", "elevenLabsKey", "azureSpeechKey"].every((key) => typeof candidate[key] === "string" && (candidate[key] as string).length <= 2000);
}

export async function POST(request: Request) {
  try {
    const uid = await authenticatedUid(request);
    const body = await request.json();
    const key = encryptionKey();

    if (body.action === "encrypt") {
      if (!validCredentials(body.credentials)) return Response.json({ error: "Invalid credential configuration." }, { status: 400 });
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      cipher.setAAD(Buffer.from(uid));
      const encrypted = Buffer.concat([cipher.update(JSON.stringify(body.credentials), "utf8"), cipher.final()]);
      const ciphertext = Buffer.concat([encrypted, cipher.getAuthTag()]).toString("base64");
      return Response.json({ ciphertext, iv: iv.toString("base64"), version: 1 });
    }

    if (body.action === "decrypt") {
      const encrypted = body.encrypted as EncryptedCredentials | undefined;
      if (!encrypted || encrypted.version !== 1 || typeof encrypted.ciphertext !== "string" || typeof encrypted.iv !== "string") {
        return Response.json({ error: "Invalid encrypted configuration." }, { status: 400 });
      }
      const packed = Buffer.from(encrypted.ciphertext, "base64");
      if (packed.length < 17) return Response.json({ error: "Invalid encrypted configuration." }, { status: 400 });
      const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(encrypted.iv, "base64"));
      decipher.setAAD(Buffer.from(uid));
      decipher.setAuthTag(packed.subarray(packed.length - 16));
      const plaintext = Buffer.concat([decipher.update(packed.subarray(0, -16)), decipher.final()]).toString("utf8");
      const credentials = JSON.parse(plaintext);
      if (!validCredentials(credentials)) throw new Error("Decrypted configuration is invalid.");
      return Response.json({ credentials });
    }

    return Response.json({ error: "Unsupported credential action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Credential sync failed.";
    const status = message.includes("Authentication") || message.includes("ID token") ? 401 : message.includes("CONFIG_ENCRYPTION_KEY") ? 503 : 500;
    return Response.json({ error: message }, { status });
  }
}
