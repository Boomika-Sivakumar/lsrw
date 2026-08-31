"use client";

import { useEffect, useRef, useState } from "react";

export interface Recorder {
  recording: boolean;
  audioUrl: string | null;
  elapsed: number;
  error: string;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

/** Reusable microphone recorder. Optionally auto-stops after `maxSeconds`. */
export function useRecorder(maxSeconds = 0): Recorder {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const mrRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (maxSeconds > 0 && recording && elapsed >= maxSeconds) stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, recording, maxSeconds]);

  async function start() {
    if (recording) return;
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        mrRef.current = null;
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      mr.start();
      mrRef.current = mr;
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch {
      setError("Microphone access denied. Please allow microphone permission and try again.");
    }
  }

  function stop() {
    if (mrRef.current && mrRef.current.state !== "inactive") {
      mrRef.current.stop();
    }
    setRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function reset() {
    stop();
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setElapsed(0);
    setError("");
  }

  return { recording, audioUrl, elapsed, error, start, stop, reset };
}