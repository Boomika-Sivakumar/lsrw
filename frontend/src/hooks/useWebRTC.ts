import { useCallback, useEffect, useRef, useState } from "react";
import type { WsMessage } from "./useDiscussionSocket";

interface RtcSignal {
  type?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export interface PeerRef {
  key: string;
  videoRef: React.RefObject<HTMLVideoElement>;
}

const STUN = { urls: "stun:stun.l.google.com:19302" };

/**
 * WebRTC mesh video/audio for the built-in discussion room.
 * - Local camera + mic (self view, togglable)
 * - Screen sharing
 * - Peer connections negotiated through the room WebSocket (offer/answer/ICE)
 * - Session recording (MediaRecorder) of the local video+audio content
 */
export function useWebRTC(myUserId: string, send: (msg: Record<string, unknown>) => void, connected: boolean) {
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [peerKeys, setPeerKeys] = useState<string[]>([]);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const selfRef = useRef({ id: myUserId, announced: false });
  const peerVideoRefs = useRef<Map<string, React.RefObject<HTMLVideoElement>>>(new Map());

  selfRef.current.id = myUserId;

  const getVideoRef = (key: string) => {
    if (!peerVideoRefs.current.has(key)) {
      peerVideoRefs.current.set(key, { current: null } as React.RefObject<HTMLVideoElement>);
    }
    return peerVideoRefs.current.get(key)!;
  };

  const createPeer = (peerKey: string) => {
    if (peersRef.current.has(peerKey) || peerKey === myUserId) return;
    const pc = new RTCPeerConnection({ iceServers: [STUN] });
    peersRef.current.set(peerKey, pc);

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        send({ type: "rtc", target: peerKey, rtc: { type: "ice", candidate: e.candidate.toJSON() } });
      }
    };
    pc.ontrack = (e) => {
      const ref = getVideoRef(peerKey);
      if (ref.current) {
        ref.current.srcObject = e.streams[0] || new MediaStream([e.track]);
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        closePeer(peerKey);
      }
    };

    const local = localStreamRef.current;
    if (local) {
      local.getTracks().forEach((t) => pc.addTrack(t, local));
    }
    const screen = screenStreamRef.current;
    if (screen) {
      screen.getTracks().forEach((t) => pc.addTrack(t, screen));
    }
  };

  const closePeer = (peerKey: string) => {
    const pc = peersRef.current.get(peerKey);
    if (pc) {
      pc.close();
      peersRef.current.delete(peerKey);
      pendingCandidatesRef.current.delete(peerKey);
      peerVideoRefs.current.delete(peerKey);
      setPeerKeys((prev) => prev.filter((k) => k !== peerKey));
    }
  };

  const attachLocal = () => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  };

  const startCamera = async () => {
    try {
      if (!localStreamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        stream.getVideoTracks().forEach((t) => (t.enabled = true));
        stream.getAudioTracks().forEach((t) => (t.enabled = true));
        attachLocal();
        peersRef.current.forEach((pc) => stream.getTracks().forEach((t) => pc.addTrack(t, stream)));
      } else {
        localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = true));
      }
      setCameraOn(true);
      setMicOn(true);
    } catch {
      setRecordingError("Camera/microphone access was denied. Recording/video may be unavailable.");
    }
  };

  const toggleCamera = async () => {
    if (cameraOn) {
      localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = false));
      setCameraOn(false);
    } else {
      if (!localStreamRef.current) {
        await startCamera();
      } else {
        localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = true));
        setCameraOn(true);
      }
    }
  };

  const toggleMic = () => {
    if (!localStreamRef.current) return;
    const next = !micOn;
    localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = next));
    setMicOn(next);
  };

  const toggleScreen = async () => {
    if (screenOn) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setScreenOn(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      screenStreamRef.current = stream;
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        screenStreamRef.current = null;
        setScreenOn(false);
      });
      peersRef.current.forEach((pc) => stream.getTracks().forEach((t) => pc.addTrack(t, stream)));
      setScreenOn(true);
    } catch {
      setRecordingError("Screen sharing was cancelled or unavailable.");
    }
  };

  const announce = useCallback(() => {
    if (connected && !selfRef.current.announced) {
      selfRef.current.announced = true;
      send({ type: "hello", video: cameraOn });
    }
  }, [connected, cameraOn, send]);

  useEffect(() => {
    announce();
  }, [announce]);

  const handleSignal = useCallback(
    (peerKey: string, signal: RtcSignal) => {
      if (peerKey === myUserId) return;
      if (signal.type === "offer") {
        createPeer(peerKey);
        const pc = peersRef.current.get(peerKey);
        if (pc) {
          pc.setRemoteDescription(signal.sdp as RTCSessionDescriptionInit)
            .then(() => {
              const queued = pendingCandidatesRef.current.get(peerKey) || [];
              pendingCandidatesRef.current.delete(peerKey);
              return Promise.all(queued.map((c) => pc.addIceCandidate(c)));
            })
            .then(() => pc.createAnswer())
            .then((answer) => pc.setLocalDescription(answer))
            .then(() => {
              if (pc.localDescription) {
                send({ type: "rtc", target: peerKey, rtc: { type: "answer", sdp: pc.localDescription } });
              }
            })
            .catch(() => closePeer(peerKey));
        }
      } else if (signal.type === "answer") {
        const pc = peersRef.current.get(peerKey);
        if (pc) {
          pc.setRemoteDescription(signal.sdp as RTCSessionDescriptionInit)
            .then(() => {
              const queued = pendingCandidatesRef.current.get(peerKey) || [];
              pendingCandidatesRef.current.delete(peerKey);
              return Promise.all(queued.map((c) => pc.addIceCandidate(c)));
            })
            .catch(() => closePeer(peerKey));
        }
      } else if (signal.type === "ice" && signal.candidate) {
        const pc = peersRef.current.get(peerKey);
        if (pc && pc.remoteDescription) {
          pc.addIceCandidate(signal.candidate).catch(() => {});
        } else {
          const queued = pendingCandidatesRef.current.get(peerKey) || [];
          pendingCandidatesRef.current.set(peerKey, [...queued, signal.candidate]);
        }
      }
    },
    [myUserId, send],
  );

  const handleMessage = useCallback(
    (msg: WsMessage) => {
      if (msg.type === "rtc" && typeof msg.from === "string") {
        handleSignal(msg.from, (msg.rtc || {}) as RtcSignal);
      }
      if (msg.type === "rtc_peers" && typeof msg.from === "string" && msg.from !== myUserId) {
        // A peer with media is online; the lexically larger ID initiates the offer.
        const peerId = msg.from;
        if (myUserId > peerId) {
          createPeer(peerId);
          const pc = peersRef.current.get(peerId);
          if (pc) {
            pc.createOffer()
              .then((offer) => pc.setLocalDescription(offer))
              .then(() => {
                if (pc.localDescription) {
                  send({ type: "rtc", target: peerId, rtc: { type: "offer", sdp: pc.localDescription } });
                }
              })
              .catch(() => closePeer(peerId));
          }
        }
      }
      if (msg.type === "participant_left" && typeof msg.user_id === "string") {
        closePeer(msg.user_id);
      }
    },
    [myUserId, handleSignal, send],
  );

  const startRecording = async () => {
    setRecordingError(null);
    const source = localStreamRef.current;
    if (!source) {
      setRecordingError("Turn on your camera/mic before recording.");
      return;
    }
    try {
      const tracks = [...source.getTracks()];
      if (screenStreamRef.current) {
        tracks.push(...screenStreamRef.current.getTracks());
      }
      const stream = new MediaStream(tracks);
      const rec = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch {
      try {
        const rec = new MediaRecorder(source);
        chunksRef.current = [];
        rec.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        rec.start();
        recorderRef.current = rec;
        setRecording(true);
      } catch {
        setRecordingError("Recording is not supported in this browser.");
      }
    }
  };

  const stopRecording = useCallback((): Promise<{ blob: Blob; mime: string } | null> => {
    return new Promise((resolve) => {
      const rec = recorderRef.current;
      if (!rec || rec.state === "inactive") {
        setRecording(false);
        resolve(null);
        return;
      }
      const finish = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "video/webm" });
        setRecording(false);
        recorderRef.current = null;
        resolve({ blob, mime: rec.mimeType || "video/webm" });
      };
      rec.onstop = finish;
      rec.stop();
    });
  }, []);

  useEffect(() => {
    return () => {
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      recorderRef.current?.stop();
    };
  }, []);

  const peerTiles = peerKeys.map((key) => ({ key, videoRef: getVideoRef(key) }));

  return {
    localVideoRef,
    peerTiles,
    cameraOn,
    micOn,
    screenOn,
    recording,
    recordingError,
    handleMessage,
    toggleCamera,
    toggleMic,
    toggleScreen,
    startRecording,
    stopRecording,
  };
}