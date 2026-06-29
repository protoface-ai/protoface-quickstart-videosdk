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

  return (
    <MeetingProvider config={config} token={session.token}>
      <VideoSdkRoom
        sessionKey={`${session.meetingId}:${session.participantId}`}
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
  onConnected,
  onDisconnected,
  onError,
  onEvent,
  onAgentAudio
}: Omit<VideoSdkMeetingProps, "session"> & { sessionKey: string }) {
  const hasStartedJoinRef = useRef(false);
  const hasJoinedMeetingRef = useRef(false);
  const meetingCleanupKeyRef = useRef<string | null>(null);
  const { join, leave, participants } = useMeeting({
    onMeetingJoined: () => {
      hasJoinedMeetingRef.current = true;
      onConnected();
      onEvent("Joined VideoSDK room.");
    },
    onMeetingLeft: () => {
      hasJoinedMeetingRef.current = false;
      onDisconnected();
      onEvent("Left VideoSDK room.");
    },
    onError: (sdkError: { message?: string }) => {
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

    joinRef.current();
    hasStartedJoinRef.current = true;

    return () => {
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
