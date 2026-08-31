import { useEffect, useState } from "react";
import { speak, stopSpeaking, pauseSpeaking, resumeSpeaking } from "../audio/tts";

interface AudioButtonProps {
  text: string;
  label?: string;
  className?: string;
}

/** A play/pause audio button backed by the browser TTS engine.
 * Toggles between Play / Pause / Resume and resets when playback ends. */
export function AudioButton({ text, label = "Play Audio", className }: AudioButtonProps) {
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => () => stopSpeaking(), []);

  const toggle = () => {
    if (playing && !paused) {
      pauseSpeaking();
      setPaused(true);
    } else if (playing && paused) {
      resumeSpeaking();
      setPaused(false);
    } else {
      setPlaying(true);
      setPaused(false);
      speak(text, () => {
        setPlaying(false);
        setPaused(false);
      });
    }
  };

  const caption = playing && !paused ? "Pause" : playing && paused ? "Resume" : label;

  return (
    <button className={className ?? "btn btn-primary mb-3"} onClick={toggle} type="button">
      {playing && !paused ? "⏸" : playing && paused ? "▶" : "▶"} {caption}
    </button>
  );
}