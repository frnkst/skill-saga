"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { loginAction, type ActionState } from "@/app/actions";
import { SubmitButton } from "./submit-button";

export function LoginForm() {
  const initialState: ActionState = { status: "idle" };
  const [state, action] = useActionState(loginAction, initialState);
  return (
    <form action={action} className="login-form">
      <label htmlFor="guardian-password">Grown-up password</label>
      <div className="input-with-icon">
        <KeyRound aria-hidden size={21} />
        <input
          autoComplete="current-password"
          id="guardian-password"
          name="password"
          placeholder="Enter your password"
          required
          type="password"
        />
      </div>
      {state.message && <p className="form-message error" role="alert">{state.message}</p>}
      <SubmitButton>Open the storybook</SubmitButton>
    </form>
  );
}
