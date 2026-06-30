import { NextResponse } from "next/server";
import { createVideoSdkToken } from "../token/video-sdk-token";

export const runtime = "nodejs";

export async function POST() {
  const requestId = crypto.randomUUID().slice(0, 8);
  try {
    console.info(`[videosdk/session:${requestId}] creating room token`);
    const apiToken = createVideoSdkToken({ permissions: ["allow_join", "allow_mod"] });
    const response = await fetch("https://api.videosdk.live/v2/rooms", {
      method: "POST",
      headers: {
        Authorization: apiToken,
        "content-type": "application/json"
      },
      body: JSON.stringify({})
    });
    const payload = (await response.json().catch(() => null)) as
      | ({ roomId?: string; id?: string; error?: unknown; message?: unknown } & Record<string, unknown>)
      | string
      | null;

    if (!response.ok) {
      throw new Error(extractVideoSdkError(payload) ?? `VideoSDK room creation failed with status ${response.status}.`);
    }

    const meetingId = typeof payload === "object" && payload ? payload.roomId ?? payload.id : null;
    if (!meetingId) {
      throw new Error("VideoSDK room response is missing roomId.");
    }

    const participantId = `protoface-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const token = createVideoSdkToken({ roomId: meetingId, participantId });
    console.info(
      `[videosdk/session:${requestId}] room created`,
      JSON.stringify({
        meetingId,
        participantId,
        token: summarizeJwt(token)
      })
    );
    return NextResponse.json({ token, meetingId, participantId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create VideoSDK room.";
    console.error(`[videosdk/session:${requestId}] failed`, message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function extractVideoSdkError(payload: { error?: unknown; message?: unknown } | string | null) {
  if (!payload) {
    return null;
  }
  if (typeof payload === "string") {
    return payload;
  }
  if (typeof payload.message === "string") {
    return payload.message;
  }
  if (typeof payload.error === "string") {
    return payload.error;
  }
  if (payload.error && typeof payload.error === "object" && "message" in payload.error) {
    const message = (payload.error as { message?: unknown }).message;
    return typeof message === "string" ? message : null;
  }
  return null;
}

function summarizeJwt(token: string) {
  const parts = token.split(".");
  const payload = parts.length === 3 ? decodeJwtPayload(parts[1]) : null;
  return {
    length: token.length,
    segments: parts.length,
    preview: `${token.slice(0, 12)}...${token.slice(-8)}`,
    payload
  };
}

function decodeJwtPayload(encodedPayload: string) {
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Record<string, unknown>;
    return {
      apikey: typeof payload.apikey === "string" ? `${payload.apikey.slice(0, 8)}...` : payload.apikey,
      permissions: payload.permissions,
      version: payload.version,
      iat: payload.iat,
      exp: payload.exp,
      roomId: payload.roomId,
      participantId: payload.participantId,
      serverNow: Math.floor(Date.now() / 1000)
    };
  } catch {
    return null;
  }
}
