import Link from "next/link";
import { LogOut, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions";
import { ProfileForm } from "@/components/profile-form";
import { getGuardianSession } from "@/lib/auth";
import { listChildProfiles } from "@/lib/game";
import { getConfig } from "@/lib/config";
import { loadSagas } from "@/lib/levels/server";

export default async function ProfilesPage() {
  if (!(await getGuardianSession())) redirect("/");
  const [profiles, sagas] = await Promise.all([listChildProfiles(), loadSagas()]);
  const config = getConfig();
  const sagaOptions = sagas.map(({ manifest }) => ({
    id: manifest.id,
    title: manifest.title,
    summary: manifest.summary,
  }));

  return (
    <main className="grownups-page">
      <header className="grownups-header">
        <Link className="wordmark" href="/"><span aria-hidden>✦</span> Skill Saga</Link>
        <form action={logoutAction}>
          <button className="button ghost compact" type="submit">
            <LogOut aria-hidden size={18} /> Log out
          </button>
        </form>
      </header>
      <section className="grownups-intro">
        <div className="grownups-icon"><Users aria-hidden /></div>
        <div>
          <h1>Set up your young adventurers</h1>
          <p>Pick a story, name the sidekicks, and make each hero feel at home.</p>
        </div>
      </section>
      <div className="profiles-stack">
        {profiles.map((profile) => (
          <ProfileForm
            defaults={{
              displayName: config.DEFAULT_HERO_NAME,
              sidekickNames: config.DEFAULT_SIDEKICK_NAMES,
            }}
            key={profile.id}
            profile={profile}
            sagas={sagaOptions}
          />
        ))}
        <ProfileForm
          defaults={{
            displayName: config.DEFAULT_HERO_NAME,
            sidekickNames: config.DEFAULT_SIDEKICK_NAMES,
          }}
          sagas={sagaOptions}
        />
      </div>
    </main>
  );
}
