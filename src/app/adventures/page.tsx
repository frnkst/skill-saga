import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Gem,
  Lock,
  Map,
  Play,
  Star,
  Trophy,
} from "lucide-react";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { getActiveChildId } from "@/lib/auth";
import { getActiveChildDashboard } from "@/lib/game";

export default async function AdventuresPage() {
  if (!(await getActiveChildId())) redirect("/");
  const dashboard = await getActiveChildDashboard();

  return (
    <main className="adventure-page">
      <header className="adventure-header">
        <Link className="wordmark" href="/"><span aria-hidden>✦</span> Skill Saga</Link>
        <Link className="hero-chip" href="/">
          <Avatar avatarKey={dashboard.child.avatarKey} size="small" />
          <span>{dashboard.child.displayName}</span>
          <span className="switch-label">Switch hero</span>
        </Link>
      </header>

      <section className="map-hero">
        <div className="map-copy">
          <span className="saga-symbol" aria-hidden>{dashboard.saga.coverImage ?? "🗺️"}</span>
          <div>
            <h1>{dashboard.saga.title}</h1>
            <p>{dashboard.saga.summary}</p>
          </div>
        </div>
        <div className="score-ribbon" aria-label="Adventure totals">
          <span><Star aria-hidden fill="currentColor" /> {dashboard.totals.stars} stars</span>
          <span><Gem aria-hidden /> {dashboard.totals.points} points</span>
          <Link href="/treasure"><Trophy aria-hidden /> Treasure</Link>
        </div>
      </section>

      {dashboard.resume && dashboard.currentLevel ? (
        <section className="continue-banner">
          <div>
            <p>Next chapter for {dashboard.child.displayName}</p>
            <h2>Level {dashboard.resume.levelNumber}: {dashboard.currentLevel.title}</h2>
          </div>
          <Link className="button primary" href="/adventures/play">
            <Play aria-hidden fill="currentColor" size={20} /> Continue story
          </Link>
        </section>
      ) : (
        <section className="continue-banner complete-banner">
          <div>
            <p>All caught up</p>
            <h2>You finished every chapter available today!</h2>
          </div>
          <Link className="button primary" href="/treasure">
            Visit treasure <Trophy aria-hidden size={20} />
          </Link>
        </section>
      )}

      <section className="level-map" aria-labelledby="map-title">
        <div className="section-heading">
          <Map aria-hidden />
          <div>
            <h2 id="map-title">Your story map</h2>
            <p>New chapters unlock in order as you complete each one.</p>
          </div>
        </div>
        <ol className="level-list">
          {dashboard.levels.map((level) => (
            <li className={`level-row ${level.status}`} key={level.id}>
              <span className="level-orb" aria-hidden>
                {level.status === "completed" ? <CheckCircle2 /> :
                  level.status === "locked" ? <Lock /> : level.levelNumber}
              </span>
              <div className="level-details">
                <span>Level {level.levelNumber}</span>
                <h3>{level.title}</h3>
              </div>
              <span className="level-status">
                {level.status === "completed" ? "Completed" :
                  level.status === "locked" ? "Locked" : "Ready"}
              </span>
              {level.status === "unlocked" && dashboard.resume?.levelId === level.id && (
                <Link aria-label={`Play ${level.title}`} href="/adventures/play">
                  <ArrowRight aria-hidden />
                </Link>
              )}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
