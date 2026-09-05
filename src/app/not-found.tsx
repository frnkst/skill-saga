import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <main className="status-page">
      <span className="status-emoji" aria-hidden>🧭</span>
      <h1>This path isn’t on the map</h1>
      <p>Let’s return to the storybook and find your adventure.</p>
      <Link className="button primary" href="/"><Home aria-hidden size={20} /> Go home</Link>
    </main>
  );
}
