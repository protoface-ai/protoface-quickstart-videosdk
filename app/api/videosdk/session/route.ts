import { NextResponse } from "next/server";
import { createVideoSdkToken } from "../token/video-sdk-token";

export const runtime = "nodejs";

export async function POST() {
  try {
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
    const token = createVideoSdkToken({ participantId });
    return NextResponse.json({ token, meetingId, participantId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create VideoSDK room.";
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
