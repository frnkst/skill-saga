"use client";

import { RotateCcw } from "lucide-react";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="status-page">
      <span className="status-emoji" aria-hidden>🌧️</span>
      <h1>A little cloud drifted in</h1>
      <p>We couldn’t open this page just now. Your progress is safe.</p>
      <button className="button primary" onClick={reset} type="button">
        <RotateCcw aria-hidden size={20} /> Try again
      </button>
    </main>
  );
}
