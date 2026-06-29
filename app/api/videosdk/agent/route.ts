import { NextResponse } from "next/server";
import { createVideoSdkToken } from "../token/video-sdk-token";

interface DispatchRequest {
  meetingId?: string;
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { meetingId } = (await request.json()) as DispatchRequest;
    if (!meetingId) {
      throw new Error("Missing meetingId.");
    }

    const token = createVideoSdkToken({ roomId: meetingId, permissions: ["allow_join", "allow_mod"] });
    const agentId = requireEnv("VIDEOSDK_AGENT_ID");
    const versionTag = process.env.VIDEOSDK_AGENT_VERSION_TAG;
    const response = await fetch("https://api.videosdk.live/v2/agent/dispatch", {
      method: "POST",
      headers: {
        Authorization: token,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        meetingId,
        agentId,
        ...(versionTag ? { versionTag } : {})
      })
    });
    const payload = (await response.json().catch(() => null)) as
      | ({ id?: string; sessionId?: string; error?: unknown; message?: unknown } & Record<string, unknown>)
      | string
      | null;

    if (!response.ok) {
      throw new Error(extractVideoSdkError(payload) ?? `VideoSDK agent dispatch failed with status ${response.status}.`);
    }

    return NextResponse.json({
      agentId,
      versionTag: versionTag ?? null,
      dispatchId: typeof payload === "object" && payload ? payload.id ?? payload.sessionId ?? null : null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to dispatch VideoSDK agent.";
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

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}
