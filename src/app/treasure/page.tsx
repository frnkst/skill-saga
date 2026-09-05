import Link from "next/link";
import { ChevronLeft, Gem, Medal, Star, Trophy } from "lucide-react";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { getActiveChildId } from "@/lib/auth";
import { getActiveChildDashboard } from "@/lib/game";

const achievementNames: Record<string, { icon: string; title: string; detail: string }> = {
  "first-task": { icon: "🌟", title: "First Spark", detail: "Solved a very first task" },
  "first-level": { icon: "🗺️", title: "Trailblazer", detail: "Completed a whole level" },
  "ten-stars": { icon: "✨", title: "Star Collector", detail: "Collected 10 shining stars" },
};
const collectibleDetails = {
  fairy: { icon: "🧚", label: "Fairies" },
  unicorn: { icon: "🦄", label: "Unicorns" },
  gem: { icon: "💎", label: "Gems" },
  "story-spark": { icon: "✨", label: "Story sparks" },
} as const;

export default async function TreasurePage() {
  if (!(await getActiveChildId())) redirect("/");
  const dashboard = await getActiveChildDashboard();
  const achievements = dashboard.achievements.map((earned) =>
    achievementNames[earned.achievement_key] ?? {
      icon: "🏅",
      title: earned.achievement_key.replaceAll("-", " "),
      detail: "A special adventure achievement",
    });
  const badges = [...new Set(dashboard.totals.badges)];

  return (
    <main className="treasure-page">
      <header className="adventure-header">
        <Link className="back-link" href="/adventures">
          <ChevronLeft aria-hidden /> Story map
        </Link>
        <div className="hero-chip">
          <Avatar avatarKey={dashboard.child.avatarKey} size="small" />
          <span>{dashboard.child.displayName}</span>
        </div>
      </header>

      <section className="treasure-hero">
        <div className="treasure-chest" aria-hidden>🧰</div>
        <h1>{dashboard.child.displayName}’s treasure</h1>
        <p>Every brave idea and clever answer adds something wonderful here.</p>
        <div className="treasure-totals">
          <div><Star aria-hidden fill="currentColor" /><strong>{dashboard.totals.stars}</strong><span>Stars</span></div>
          <div><Gem aria-hidden /><strong>{dashboard.totals.points}</strong><span>Points</span></div>
          <div><Trophy aria-hidden /><strong>{badges.length}</strong><span>Badges</span></div>
        </div>
      </section>

      <section className="treasure-section">
        <h2><Medal aria-hidden /> Badges &amp; achievements</h2>
        {badges.length || achievements.length ? (
          <div className="badge-shelf">
            {badges.map((badge) => (
              <div className="earned-badge" key={badge}>
                <span aria-hidden>🏅</span>
                <strong>{badge}</strong>
                <small>Saga badge</small>
              </div>
            ))}
            {achievements.map((achievement) => (
              <div className="earned-badge" key={achievement.title}>
                <span aria-hidden>{achievement.icon}</span>
                <strong>{achievement.title}</strong>
                <small>{achievement.detail}</small>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-treasure">
            <span aria-hidden>🔐</span>
            <div>
              <h3>Your first treasure is waiting</h3>
              <p>Finish a quest and come back to see what you earned.</p>
            </div>
          </div>
        )}
      </section>
      <section className="treasure-section">
        <h2><Star aria-hidden /> Magical collection</h2>
        <div className="badge-shelf">
          {Object.entries(collectibleDetails).map(([type, details]) => (
            <div className="earned-badge" key={type}>
              <span aria-hidden>{details.icon}</span>
              <strong>{dashboard.totals.collectibles[type as keyof typeof collectibleDetails]}</strong>
              <small>{details.label}</small>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
