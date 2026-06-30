import { AccessToken } from "livekit-server-sdk";
import { NextResponse } from "next/server";
import { ProtofaceApiClient } from "protoface-client";

export const runtime = "nodejs";

interface SessionTokenRequest {
  avatarId?: string;
  maxSessionLength?: number;
  maxIdleTime?: number;
  metadata?: Record<string, string | number | boolean | null>;
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID().slice(0, 8);
  try {
    const body = (await request.json()) as SessionTokenRequest;
    const avatarId = requireBodyValue("avatarId", body.avatarId);
    console.info(
      `[protoface/session:${requestId}] creating`,
      JSON.stringify({ avatarId, metadata: body.metadata ?? null })
    );

    const protofaceApiKey = requireEnv("PROTOFACE_API_KEY");
    const livekitUrl = requireEnv("LIVEKIT_URL");
    const livekitApiKey = requireEnv("LIVEKIT_API_KEY");
    const livekitApiSecret = requireEnv("LIVEKIT_API_SECRET");

    const roomName = `protoface-videosdk-${crypto.randomUUID()}`;
    const viewerIdentity = `viewer-${crypto.randomUUID()}`;
    const workerIdentity = "protoface-avatar-agent";

    const [participantToken, workerToken] = await Promise.all([
      createLiveKitToken({
        apiKey: livekitApiKey,
        apiSecret: livekitApiSecret,
        identity: viewerIdentity,
        roomName,
        canPublish: false
      }),
      createLiveKitToken({
        apiKey: livekitApiKey,
        apiSecret: livekitApiSecret,
        identity: workerIdentity,
        roomName,
        canPublish: true
      })
    ]);

    const protoface = new ProtofaceApiClient({ apiKey: protofaceApiKey });
    const session = await protoface.createLiveKitSession({
      avatarId,
      livekitUrl,
      roomName,
      workerToken,
      workerIdentity,
      maxDurationSeconds: body.maxSessionLength ?? 600,
      idleTimeoutSeconds: body.maxIdleTime ?? 180,
      metadata: {
        example: "create-protoface-app-videosdk",
        provider: "videosdk",
        ...body.metadata
      }
    });
    console.info(
      `[protoface/session:${requestId}] created`,
      JSON.stringify({ sessionId: session.id, roomName, workerIdentity })
    );

    return NextResponse.json({
      sessionToken: session.id,
      livekitUrl,
      roomName,
      participantToken,
      sessionId: session.id,
      avatarId,
      avatarIdentity: workerIdentity,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create session token.";
    console.error(`[protoface/session:${requestId}] create failed`, message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const requestId = crypto.randomUUID().slice(0, 8);
  try {
    const { sessionId } = (await request.json()) as { sessionId?: string };
    if (!sessionId) {
      throw new Error("Missing sessionId.");
    }

    console.info(`[protoface/session:${requestId}] ending`, JSON.stringify({ sessionId }));
    const protoface = new ProtofaceApiClient({ apiKey: requireEnv("PROTOFACE_API_KEY") });
    await protoface.endSession(sessionId);
    console.info(`[protoface/session:${requestId}] ended`, JSON.stringify({ sessionId }));
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to end session.";
    console.error(`[protoface/session:${requestId}] end failed`, message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

async function createLiveKitToken(options: {
  apiKey: string;
  apiSecret: string;
  identity: string;
  roomName: string;
  canPublish: boolean;
}) {
  const token = new AccessToken(options.apiKey, options.apiSecret, {
    identity: options.identity,
    ttl: "10m"
  });

  token.addGrant({
    room: options.roomName,
    roomJoin: true,
    canPublish: options.canPublish,
    canSubscribe: true,
    canPublishData: true
  });

  return token.toJwt();
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}

function requireBodyValue(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}
