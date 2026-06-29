import { NextResponse } from "next/server";
import { createVideoSdkToken } from "./video-sdk-token";

export const runtime = "nodejs";

interface TokenRequest {
  roomId?: string;
  participantId?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as TokenRequest;
    const token = createVideoSdkToken({
      roomId: body.roomId,
      participantId: body.participantId
    });

    return NextResponse.json({ token });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create VideoSDK token.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
