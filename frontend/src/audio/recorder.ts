import { useCallback, useRef, useState } from "react";

export interface RecordingResult {
  transcript: string;
  durationMs: number;
  audioBlob: Blob | null;
}

interface SpeechRecognitionEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionCtor {
  new (): SpeechRecognitionInstance;
}

function getRecognition(): SpeechRecognitionInstance | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/**
 * Microphone recorder producing audio (MediaRecorder) + live transcript
 * (browser Web Speech API when available). The transcript is used as the
 * development STT fallback on the backend.
 */
export function useRecorder() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supportError, setSupportError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef(0);
  const finalTranscriptRef = useRef("");

  const start = useCallback(async () => {
    setSupportError(null);
    finalTranscriptRef.current = "";
    setTranscript("");
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.start();
      recorderRef.current = rec;
      startRef.current = Date.now();

      // Speech recognition for live transcript (dev STT fallback).
      const recognition = getRecognition();
      if (recognition) {
        recognition.lang = "en-US";
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (e) => {
          let text = "";
          for (let i = 0; i < e.results.length; i++) {
            text += e.results[i][0].transcript;
          }
          finalTranscriptRef.current = text;
          setTranscript(text);
        };
        recognition.onerror = () => {};
        recognition.onend = () => {};
        recognition.start();
        recognitionRef.current = recognition;
      }
      setRecording(true);
    } catch {
      setSupportError("Microphone permission denied or unavailable. You can type your answer instead.");
      setRecording(false);
    }
  }, []);

  const stop = useCallback((): Promise<RecordingResult> => {
    return new Promise((resolve) => {
      const rec = recorderRef.current;
      const recognition = recognitionRef.current;
      const durationMs = Date.now() - startRef.current;

      const finish = () => {
        const audioBlob =
          chunksRef.current.length > 0
            ? new Blob(chunksRef.current, { type: rec?.mimeType || "audio/webm" })
            : null;
        setRecording(false);
        recognition?.stop();
        resolve({ transcript: finalTranscriptRef.current, durationMs, audioBlob });
      };

      if (rec && rec.state !== "inactive") {
        rec.onstop = finish;
        rec.stop();
        rec.stream.getTracks().forEach((t) => t.stop());
      } else {
        finish();
      }
    });
  }, []);

  return { recording, transcript, supportError, start, stop };
}
