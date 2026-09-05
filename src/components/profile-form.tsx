"use client";

import { useActionState } from "react";
import { Check, Save, UserPlus } from "lucide-react";
import { saveProfileAction, type ActionState } from "@/app/actions";
import { AVATARS, type AvatarKey } from "@/lib/game/avatars";
import { SubmitButton } from "./submit-button";

type SagaOption = { id: string; title: string; summary: string };
type Profile = {
  id: string;
  displayName: string;
  sidekickNames: string[];
  avatarKey: AvatarKey;
  sagaId: string;
};

export function ProfileForm({
  profile,
  sagas,
  defaults,
}: {
  profile?: Profile;
  sagas: SagaOption[];
  defaults: { displayName: string; sidekickNames: string[] };
}) {
  const initialState: ActionState = { status: "idle" };
  const [state, action] = useActionState(saveProfileAction, initialState);
  const prefix = profile?.id ?? "new";
  return (
    <form action={action} className="profile-form">
      {profile && <input name="id" type="hidden" value={profile.id} />}
      <div className="profile-form-title">
        {profile ? <Save aria-hidden size={21} /> : <UserPlus aria-hidden size={21} />}
        <h2>{profile ? `Customize ${profile.displayName}` : "Create a new hero"}</h2>
      </div>

      <fieldset>
        <legend>Choose an adventure buddy</legend>
        <div className="avatar-picker">
          {AVATARS.map((avatar, index) => (
            <label className="avatar-option" key={avatar.key}>
              <input
                defaultChecked={profile ? profile.avatarKey === avatar.key : index === 0}
                name="avatarKey"
                required
                type="radio"
                value={avatar.key}
              />
              <span aria-hidden>{avatar.emoji}</span>
              <small>{avatar.label}</small>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="form-grid">
        <label htmlFor={`${prefix}-name`}>
          Hero name
          <input
            defaultValue={profile?.displayName ?? defaults.displayName}
            id={`${prefix}-name`}
            maxLength={80}
            name="displayName"
            required
          />
        </label>
        <label htmlFor={`${prefix}-sidekicks`}>
          Sidekick names <span className="label-help">(separate with commas)</span>
          <input
            defaultValue={(profile?.sidekickNames ?? defaults.sidekickNames).join(", ")}
            id={`${prefix}-sidekicks`}
            name="sidekickNames"
            placeholder="Spark, Whiskers"
          />
        </label>
      </div>

      <label htmlFor={`${prefix}-saga`}>
        Story saga
        <select
          defaultValue={profile?.sagaId ?? sagas[0]?.id}
          id={`${prefix}-saga`}
          name="sagaId"
          required
        >
          {sagas.map((saga) => (
            <option key={saga.id} value={saga.id}>{saga.title} — {saga.summary}</option>
          ))}
        </select>
      </label>

      <div className="form-footer">
        {state.message && (
          <p className={`form-message ${state.status}`} role={state.status === "error" ? "alert" : "status"}>
            {state.status === "success" && <Check aria-hidden size={18} />}
            {state.message}
          </p>
        )}
        <SubmitButton className="button primary">
          {profile ? "Save hero" : "Create hero"}
        </SubmitButton>
      </div>
    </form>
  );
}
