"use client";

import dynamic from "next/dynamic";
import { ProtofaceClient } from "protoface-client";
import { useRef, useState } from "react";
import type { StopListening } from "protoface-client";
import type { VideoSdkMeetingProps } from "./videosdk-meeting";

const VideoSdkMeeting = dynamic<VideoSdkMeetingProps>(() => import("./videosdk-meeting"), {
  ssr: false
});

const avatar = {
  protoface_avatarid: process.env.NEXT_PUBLIC_PROTOFACE_AVATAR_ID || "av_stock_001"
};

type SessionState = "idle" | "starting" | "connected" | "disconnecting" | "disconnected" | "error";

interface VideoSdkSessionResponse {
  token: string;
  meetingId: string;
  participantId: string;
}

interface VideoSdkAgentResponse {
  agentId: string;
  versionTag?: string | null;
  dispatchId?: string | null;
}

interface ProtofaceConnectionResponse {
  sessionToken: string;
  livekitUrl: string;
  roomName: string;
  participantToken: string;
  sessionId?: string;
  avatarId?: string;
  avatarIdentity?: string;
  expiresAt?: string;
}

interface ActiveSession {
  token: string;
  meetingId: string;
  participantId: string;
  agentId: string;
  agentVersionTag?: string | null;
  dispatchId?: string | null;
}

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const protofaceRef = useRef<ProtofaceClient | null>(null);
  const audioCleanupRef = useRef<StopListening | null>(null);
  const cleanupPromiseRef = useRef<Promise<void> | null>(null);

  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [state, setState] = useState<SessionState>("idle");
  const [mode, setMode] = useState("idle");
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<string[]>([]);

  const isRunning = state === "starting" || state === "connected" || state === "disconnecting";
  const canDisconnect = state === "starting" || state === "connected";

  async function start() {
    if (isRunning) {
      return;
    }

    setState("starting");
    setMode("starting");
    setError(null);
    setEvents([]);

    try {
      const videosdk = await createVideoSdkSession();
      const connection = await createProtofaceConnection({
        avatarId: avatar.protoface_avatarid,
        maxSessionLength: 600,
        maxIdleTime: 180,
        metadata: {
          provider: "videosdk",
          meetingId: videosdk.meetingId
        }
      });

      const protoface = new ProtofaceClient({
        avatarId: connection.avatarId ?? avatar.protoface_avatarid,
        livekitUrl: connection.livekitUrl,
        roomName: connection.roomName,
        participantToken: connection.participantToken,
        workerToken: "server-created",
        workerIdentity: connection.avatarIdentity,
        videoElement: videoRef.current,
        audioElement: audioRef.current,
        apiClient: createBrowserSessionApi(connection)
      });

      protoface.on("start", () => pushEvent("Protoface started."));
      protoface.on("error", ({ error: protofaceError }) => {
        const message = protofaceError instanceof Error ? protofaceError.message : "Protoface failed.";
        setError(message);
        pushEvent(`Protoface error: ${message}`);
        void endSession("error");
      });
      protoface.on("speaking", () => {
        setMode("speaking");
        pushEvent("Protoface is speaking.");
      });
      protoface.on("silent", () => {
        setMode("listening");
        pushEvent("Protoface is ready.");
      });

      await protoface.start();
      protofaceRef.current = protoface;

      const agent = await dispatchVideoSdkAgent(videosdk.meetingId);
      setActiveSession({
        ...videosdk,
        agentId: agent.agentId,
        agentVersionTag: agent.versionTag,
        dispatchId: agent.dispatchId
      });
      pushEvent("VideoSDK room created and agent dispatched.");
    } catch (startError) {
      const message = normalizeError(startError);
      setError(message);
      pushEvent(`Start failed: ${message}`);
      await endSession("error");
      setState("error");
    }
  }

  async function stop() {
    await endSession("disconnected");
    pushEvent("Session stopped.");
  }

  async function connectAgentAudio(track: MediaStreamTrack) {
    if (!protofaceRef.current || audioCleanupRef.current) {
      return;
    }

    audioCleanupRef.current = await protofaceRef.current.listenToMediaStreamTrack(track);
    pushEvent("VideoSDK agent audio connected to Protoface.");
  }

  async function endSession(nextState: "disconnected" | "error") {
    if (cleanupPromiseRef.current) {
      await cleanupPromiseRef.current;
      return;
    }

    setState("disconnecting");
    cleanupPromiseRef.current = cleanupSession();
    await cleanupPromiseRef.current;
    cleanupPromiseRef.current = null;
    setState(nextState);
  }

  async function cleanupSession() {
    setMode("idle");
    audioCleanupRef.current?.();
    audioCleanupRef.current = null;
    setActiveSession(null);
    await protofaceRef.current?.stop();
    protofaceRef.current = null;
  }

  function pushEvent(message: string) {
    setEvents((current) => [message, ...current].slice(0, 8));
  }

  return (
    <main className="page">
      <header className="topbar">
        <a className="brand" href="https://protoface.com" target="_blank" rel="noreferrer">
          <span>Protoface</span>
        </a>

        <nav className="navLinks" aria-label="Starter links">
          <a href="https://docs.protoface.com/guides/avatars" target="_blank" rel="noreferrer">
            Docs
          </a>
          <a href="https://docs.videosdk.live" target="_blank" rel="noreferrer">
            VideoSDK
          </a>
          <a href="https://app.protoface.com" target="_blank" rel="noreferrer">
            Login
          </a>
        </nav>
      </header>

      <div className="shell">
        <section className="stage" aria-label="Protoface avatar stage">
          {state !== "connected" ? (
            <div className="stagePreview">
              <p className="eyebrow">Protoface preview</p>
              <h2>Your avatar will appear here once the conversation starts.</h2>
              <p>Start a session to test a VideoSDK AI agent with a realtime Protoface avatar.</p>
            </div>
          ) : null}
          <video ref={videoRef} className="avatarVideo" autoPlay playsInline />
          <audio ref={audioRef} autoPlay />
        </section>

        <aside className="controls">
          <section className="intro">
            <h1>Realtime avatars for AI.</h1>
            <p>
              Add a realtime Protoface avatar to a VideoSDK AI agent. Start a session to try the full conversation flow.
            </p>
          </section>

          <section className="status">
            <div className="buttonRow">
              <button className="button" type="button" onClick={start} disabled={isRunning}>
                {state === "starting" ? "Starting" : "Start conversation"}
              </button>
              <button className="button secondary" type="button" onClick={stop} disabled={!canDisconnect}>
                End conversation
              </button>
            </div>

            {activeSession ? (
              <VideoSdkMeeting
                session={activeSession}
                onConnected={() => {
                  setState("connected");
                  setMode("listening");
                }}
                onDisconnected={() => void endSession("disconnected")}
                onError={(message) => {
                  if (isTransientVideoSdkStartupError(message)) {
                    pushEvent(`VideoSDK startup retry: ${message}`);
                    return;
                  }
                  setError(message);
                  pushEvent(`VideoSDK error: ${message}`);
                  void endSession("error");
                }}
                onEvent={pushEvent}
                onAgentAudio={connectAgentAudio}
              />
            ) : null}

            <div className="statusList">
              <div className="statusItem">
                <strong>Session</strong>
                <span className="pill">{formatStatusLabel(state)}</span>
              </div>
              <div className="statusItem">
                <strong>VideoSDK room</strong>
                <span className="pill">{shortId(activeSession?.meetingId)}</span>
              </div>
              <div className="statusItem">
                <strong>Mode</strong>
                <span className="pill">{formatStatusLabel(mode)}</span>
              </div>
              <div className="statusItem">
                <strong>Protoface avatar</strong>
                <span className="pill">{avatar.protoface_avatarid}</span>
              </div>
              <div className="statusItem">
                <strong>VideoSDK agent</strong>
                <span className="pill">{shortId(activeSession?.agentId)}</span>
              </div>
            </div>

            {error ? <p className="error">{error}</p> : null}
          </section>

          <section className="log">
            <h2>Events</h2>
            <ul className="logList" aria-live="polite">
              {events.length > 0 ? (
                events.map((event, index) => <li key={`${event}-${index}`}>{event}</li>)
              ) : (
                <li>Ready when you are.</li>
              )}
            </ul>
          </section>

          <section className="quickStart">
            <h2>Quick start</h2>
            <ol>
              <li>Add keys to `.env`.</li>
              <li>Create or deploy a VideoSDK AI agent.</li>
              <li>Set the avatar ID you want to preview.</li>
            </ol>
          </section>
        </aside>
      </div>
    </main>
  );
}

async function createVideoSdkSession() {
  const response = await fetch("/api/videosdk/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({})
  });
  const payload = (await response.json()) as VideoSdkSessionResponse & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to create VideoSDK room.");
  }
  return payload;
}

async function dispatchVideoSdkAgent(meetingId: string) {
  const response = await fetch("/api/videosdk/agent", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ meetingId })
  });
  const payload = (await response.json()) as VideoSdkAgentResponse & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to dispatch VideoSDK agent.");
  }
  return payload;
}

async function createProtofaceConnection(body: {
  avatarId: string;
  maxSessionLength: number;
  maxIdleTime: number;
  metadata: Record<string, string | number | boolean | null>;
}) {
  const response = await fetch("/api/protoface/session-token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = (await response.json()) as ProtofaceConnectionResponse & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to create Protoface session.");
  }
  return payload;
}

function createBrowserSessionApi(connection: ProtofaceConnectionResponse) {
  return {
    async createLiveKitSession() {
      return {
        id: connection.sessionId ?? connection.sessionToken,
        status: "running" as const,
        avatar_id: connection.avatarId ?? avatar.protoface_avatarid,
        transport: {
          type: "livekit" as const,
          url: connection.livekitUrl,
          room_name: connection.roomName,
          audio_source: "data_stream" as const,
          worker_identity: connection.avatarIdentity
        },
        quality: "standard",
        max_duration_seconds: 600,
        idle_timeout_seconds: 180,
        metadata: {},
        created_at: new Date().toISOString()
      };
    },
    async endSession(sessionId: string) {
      await fetch("/api/protoface/session-token", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId })
      });
    }
  };
}

function normalizeError(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function shortId(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }
  return value.length > 16 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}

function formatStatusLabel(value: string | null | undefined) {
  if (!value) {
    return "Not started";
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isTransientVideoSdkStartupError(message: string) {
  return /init-config|server configurations|status 400/i.test(message);
}
