import { createHmac } from "node:crypto";

interface VideoSdkTokenOptions {
  roomId?: string;
  participantId?: string;
  expiresInSeconds?: number;
  permissions?: Array<"allow_join" | "ask_join" | "allow_mod">;
}

export function createVideoSdkToken(options: VideoSdkTokenOptions = {}) {
  const apiKey = requireEnv("VIDEOSDK_API_KEY");
  const secret = requireEnv("VIDEOSDK_SECRET");
  const now = Math.floor(Date.now() / 1000);
  const expiresInSeconds = options.expiresInSeconds ?? 120 * 60;
  const payload = {
    apikey: apiKey,
    permissions: options.permissions ?? ["allow_join"],
    version: 2,
    iat: now,
    exp: now + expiresInSeconds,
    ...(options.roomId ? { roomId: options.roomId } : {}),
    ...(options.participantId ? { participantId: options.participantId } : {})
  };

  return signJwt(payload, secret);
}

function signJwt(payload: Record<string, unknown>, secret: string) {
  const header = {
    alg: "HS256",
    typ: "JWT"
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(`${encodedHeader}.${encodedPayload}`).digest("base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}
