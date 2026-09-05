import Link from "next/link";
import { ArrowRight, Settings, Sparkles } from "lucide-react";
import { chooseChildAction } from "@/app/actions";
import { Avatar } from "@/components/avatar";
import { LoginForm } from "@/components/login-form";
import { getGuardianSession } from "@/lib/auth";
import { listChildProfiles } from "@/lib/game";

export default async function Home() {
  const session = await getGuardianSession();

  if (!session) {
    return (
      <main className="gate-page">
        <div className="cloud cloud-one" />
        <div className="cloud cloud-two" />
        <section className="gate-panel">
          <div className="brand-mark" aria-hidden>✦</div>
          <h1>Every little hero has a big story.</h1>
          <p className="lead">
            Grown-ups open the storybook, then young adventurers choose their hero.
          </p>
          <LoginForm />
          <p className="quiet-note">A private story space for your family.</p>
        </section>
      </main>
    );
  }

  const profiles = await listChildProfiles();
  return (
    <main className="storybook-page">
      <header className="home-header">
        <div className="wordmark"><span aria-hidden>✦</span> Skill Saga</div>
        <Link className="button secondary compact" href="/grown-ups/profiles">
          <Settings aria-hidden size={18} /> Setup &amp; customize
        </Link>
      </header>
      <section className="hero-chooser">
        <div className="chooser-copy">
          <Sparkles aria-hidden className="title-spark" />
          <h1>Who’s adventuring today?</h1>
          <p>Choose your hero and jump back into the tale.</p>
        </div>
        {profiles.length ? (
          <div className="hero-grid">
            {profiles.map((profile) => (
              <form action={chooseChildAction} key={profile.id}>
                <input name="childId" type="hidden" value={profile.id} />
                <button className="hero-choice" type="submit">
                  <Avatar avatarKey={profile.avatarKey} size="large" />
                  <span className="hero-name">{profile.displayName}</span>
                  <span className="hero-saga">Ready for adventure</span>
                  <span className="choice-arrow" aria-hidden><ArrowRight size={20} /></span>
                </button>
              </form>
            ))}
          </div>
        ) : (
          <div className="empty-story">
            <span aria-hidden className="empty-illustration">🌱</span>
            <h2>Your story garden is ready</h2>
            <p>Create the first hero, choose a saga, and the adventure can begin.</p>
            <Link className="button primary" href="/grown-ups/profiles">
              Create a hero <ArrowRight aria-hidden size={20} />
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
