"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";

export function ReadAloud({ text }: { text: string }) {
  const supported = useSyncExternalStore(
    () => () => undefined,
    () => "speechSynthesis" in window,
    () => false,
  );
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  function toggle() {
    if (!supported) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  return (
    <button
      aria-label={supported ? (speaking ? "Stop reading aloud" : "Read quest aloud") : "Read aloud unavailable"}
      className="read-aloud"
      disabled={!supported}
      onClick={toggle}
      title={supported ? "Read aloud" : "Your browser does not support read aloud"}
      type="button"
    >
      {supported ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
      <span>{speaking ? "Stop" : supported ? "Read aloud" : "Unavailable"}</span>
    </button>
  );
}
