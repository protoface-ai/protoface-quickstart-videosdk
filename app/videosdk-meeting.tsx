"use client";

import { MeetingProvider, useAgentParticipant, useMeeting } from "@videosdk.live/react-sdk";
import { useEffect, useMemo, useRef } from "react";

const pendingLeaveTimers = new Map<string, number>();

export interface VideoSdkMeetingProps {
  session: {
    token: string;
    meetingId: string;
    participantId: string;
  };
  onConnected: () => void;
  onDisconnected: () => void;
  onError: (message: string) => void;
  onEvent: (message: string) => void;
  onAgentAudio: (track: MediaStreamTrack) => Promise<void>;
}

export default function VideoSdkMeeting({
  session,
  onConnected,
  onDisconnected,
  onError,
  onEvent,
  onAgentAudio
}: VideoSdkMeetingProps) {
  const sessionSummary = useMemo(() => summarizeSession(session), [session]);
  const config = useMemo(
    () => ({
      meetingId: session.meetingId,
      participantId: session.participantId,
      micEnabled: true,
      webcamEnabled: false,
      debugMode: false,
      name: "Protoface viewer"
    }),
    [session.meetingId, session.participantId]
  );

  useEffect(() => {
    console.info("[videosdk/meeting] provider session", sessionSummary);
  }, [sessionSummary]);

  return (
    <MeetingProvider config={config} token={session.token}>
      <VideoSdkRoom
        sessionKey={`${session.meetingId}:${session.participantId}`}
        sessionSummary={sessionSummary}
        onConnected={onConnected}
        onDisconnected={onDisconnected}
        onError={onError}
        onEvent={onEvent}
        onAgentAudio={onAgentAudio}
      />
    </MeetingProvider>
  );
}

function VideoSdkRoom({
  sessionKey,
  sessionSummary,
  onConnected,
  onDisconnected,
  onError,
  onEvent,
  onAgentAudio
}: Omit<VideoSdkMeetingProps, "session"> & { sessionKey: string; sessionSummary: ReturnType<typeof summarizeSession> }) {
  const hasStartedJoinRef = useRef(false);
  const hasJoinedMeetingRef = useRef(false);
  const joinTimerRef = useRef<number | null>(null);
  const meetingCleanupKeyRef = useRef<string | null>(null);
  const { join, leave, participants } = useMeeting({
    onMeetingJoined: () => {
      hasJoinedMeetingRef.current = true;
      console.info("[videosdk/meeting] joined", { sessionKey, session: sessionSummary });
      onConnected();
      onEvent("Joined VideoSDK room.");
    },
    onMeetingLeft: () => {
      hasJoinedMeetingRef.current = false;
      console.info("[videosdk/meeting] left", { sessionKey });
      onDisconnected();
      onEvent("Left VideoSDK room.");
    },
    onError: (sdkError: { message?: string }) => {
      console.error("[videosdk/meeting] sdk error", { sessionKey, session: sessionSummary, sdkError });
      onError(sdkError.message ?? "VideoSDK meeting failed.");
    }
  });
  const joinRef = useRef(join);
  const leaveRef = useRef(leave);
  const onEventRef = useRef(onEvent);

  joinRef.current = join;
  leaveRef.current = leave;
  onEventRef.current = onEvent;

  useEffect(() => {
    const cleanupKey = sessionKey;
    meetingCleanupKeyRef.current = cleanupKey;
    const pendingTimer = pendingLeaveTimers.get(cleanupKey);
    if (pendingTimer) {
      window.clearTimeout(pendingTimer);
      pendingLeaveTimers.delete(cleanupKey);
    }

    if (!hasStartedJoinRef.current && joinTimerRef.current === null) {
      joinTimerRef.current = window.setTimeout(() => {
        joinTimerRef.current = null;
        if (meetingCleanupKeyRef.current !== cleanupKey || hasStartedJoinRef.current) {
          return;
        }
        hasStartedJoinRef.current = true;
        console.info("[videosdk/meeting] joining", { sessionKey, session: sessionSummary });
        joinRef.current();
      }, 100);
    }

    return () => {
      if (joinTimerRef.current !== null) {
        window.clearTimeout(joinTimerRef.current);
        joinTimerRef.current = null;
      }
      console.info("[videosdk/meeting] cleanup", {
        sessionKey,
        hasJoinedMeeting: hasJoinedMeetingRef.current,
        hasStartedJoin: hasStartedJoinRef.current
      });
      if (!hasJoinedMeetingRef.current) {
        return;
      }
      const key = meetingCleanupKeyRef.current;
      if (!key) {
        return;
      }
      const timer = window.setTimeout(() => {
        pendingLeaveTimers.delete(key);
        Promise.resolve(leaveRef.current()).catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "VideoSDK leave failed.";
          console.error("[videosdk/meeting] leave failed", { sessionKey: key, error });
          onEventRef.current(`VideoSDK leave skipped: ${message}`);
        });
      }, 250);
      pendingLeaveTimers.set(key, timer);
    };
  }, [sessionKey]);

  return (
    <>
      {[...participants.entries()].map(([participantId, participant]) =>
        isVideoSdkAgentParticipant(participant) ? (
          <VideoSdkAgentAudio key={participantId} participantId={participantId} onAgentAudio={onAgentAudio} />
        ) : null
      )}
    </>
  );
}

function isVideoSdkAgentParticipant(participant: unknown) {
  return (
    typeof participant === "object" &&
    participant !== null &&
    "isAgent" in participant &&
    (participant as { isAgent?: unknown }).isAgent === true
  );
}

function VideoSdkAgentAudio({
  participantId,
  onAgentAudio
}: {
  participantId: string;
  onAgentAudio: (track: MediaStreamTrack) => Promise<void>;
}) {
  const connectedTrackRef = useRef<string | null>(null);
  const { micStream } = useAgentParticipant(participantId);

  useEffect(() => {
    const track = micStream?.track;
    if (!track || connectedTrackRef.current === track.id) {
      return;
    }
    connectedTrackRef.current = track.id;
    void onAgentAudio(track);
  }, [micStream?.track, onAgentAudio]);

  return null;
}

function summarizeSession(session: VideoSdkMeetingProps["session"]) {
  return {
    meetingId: session.meetingId,
    participantId: session.participantId,
    token: summarizeJwt(session.token)
  };
}

function summarizeJwt(token: string | undefined) {
  if (!token) {
    return { present: false };
  }

  const parts = token.split(".");
  return {
    present: true,
    length: token.length,
    segments: parts.length,
    preview: `${token.slice(0, 12)}...${token.slice(-8)}`,
    payload: parts.length === 3 ? decodeJwtPayload(parts[1]) : null
  };
}

function decodeJwtPayload(encodedPayload: string) {
  try {
    const payload = JSON.parse(atob(base64UrlToBase64(encodedPayload))) as Record<string, unknown>;
    return {
      apikey: typeof payload.apikey === "string" ? `${payload.apikey.slice(0, 8)}...` : payload.apikey,
      permissions: payload.permissions,
      version: payload.version,
      iat: payload.iat,
      exp: payload.exp,
      roomId: payload.roomId,
      participantId: payload.participantId,
      browserNow: Math.floor(Date.now() / 1000)
    };
  } catch {
    return null;
  }
}

function base64UrlToBase64(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  return base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
}
