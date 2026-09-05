"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";
import {
  submitTaskAction,
  type ActionState,
} from "@/app/actions";
import type { ClientSafeTask } from "@/lib/levels/client-safe";
import { interpolatePlainText, type TemplateContext } from "@/lib/levels/interpolation";

type TaskLocation = {
  levelId: string;
  questId: string;
  partId: string;
  taskId: string;
};

export function TaskPlayer({
  task,
  location,
  successMessageTemplate,
  templateContext,
}: {
  task: ClientSafeTask;
  location: TaskLocation;
  successMessageTemplate?: string;
  templateContext: TemplateContext;
}) {
  const router = useRouter();
  const submit = submitTaskAction.bind(null, location);
  const initialState: ActionState = { status: "idle" };
  const [state, action, pending] = useActionState(submit, initialState);
  const [text, setText] = useState("");
  const [choice, setChoice] = useState("");
  const [items, setItems] = useState(task.type === "sequence" ? task.items : []);
  const [pairs, setPairs] = useState<Record<string, string>>({});
  const [hintOpen, setHintOpen] = useState(false);

  useEffect(() => {
    if (state.status !== "success") return;
    const timer = window.setTimeout(() => router.refresh(), 950);
    return () => window.clearTimeout(timer);
  }, [router, state.status]);

  function response(): unknown {
    switch (task.type) {
      case "single-input":
      case "creative-input":
        return text;
      case "number-input":
        return text === "" ? null : Number(text);
      case "multiple-choice":
        return choice;
      case "sequence":
        return items.map((item) => item.id);
      case "matching":
        return task.left.map((left) => ({ leftId: left.id, rightId: pairs[left.id] }));
    }
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    setItems((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const ready = task.type === "multiple-choice"
    ? Boolean(choice)
    : task.type === "matching"
      ? task.left.every((item) => pairs[item.id])
      : task.type === "single-input" || task.type === "number-input" || task.type === "creative-input"
        ? text.trim().length > 0
        : true;
  const successMessage = successMessageTemplate
    ? interpolatePlainText(successMessageTemplate, {
        ...templateContext,
        answers: {
          ...templateContext.answers,
          ...(task.type === "creative-input" && text.trim()
            ? { [task.variableKey]: text.trim() }
            : {}),
        },
      })
    : undefined;

  return (
    <form
      action={() => action(response())}
      className="task-player"
    >
      {task.type === "single-input" && (
        <label className="answer-label">
          Your answer
          <input
            autoFocus
            maxLength={200}
            onChange={(event) => setText(event.target.value)}
            placeholder={task.placeholder ?? "Type your answer"}
            value={text}
          />
        </label>
      )}

      {task.type === "number-input" && (
        <label className="answer-label">
          Your answer
          <input
            autoFocus
            inputMode="decimal"
            onChange={(event) => setText(event.target.value)}
            placeholder="Type a number"
            type="number"
            value={text}
          />
        </label>
      )}

      {task.type === "creative-input" && (
        <label className="answer-label">
          Your idea
          {task.multiline ? (
            <textarea
              autoFocus
              maxLength={task.maxLength}
              minLength={task.minLength}
              onChange={(event) => setText(event.target.value)}
              placeholder="Let your imagination fly…"
              required
              rows={4}
              value={text}
            />
          ) : (
            <input
              autoFocus
              maxLength={task.maxLength}
              minLength={task.minLength}
              onChange={(event) => setText(event.target.value)}
              placeholder="Type your idea"
              required
              value={text}
            />
          )}
          <small>{text.length} / {task.maxLength}</small>
        </label>
      )}

      {task.type === "multiple-choice" && (
        <fieldset className="choice-list">
          <legend className="sr-only">Choose one answer</legend>
          {task.options.map((option) => (
            <label className="choice-option" key={option.id}>
              <input
                checked={choice === option.id}
                name="choice"
                onChange={() => setChoice(option.id)}
                type="radio"
                value={option.id}
              />
              <span>{option.label}</span>
              <CheckCircle2 aria-hidden />
            </label>
          ))}
        </fieldset>
      )}

      {task.type === "sequence" && (
        <ol className="sequence-list" aria-label="Items in your chosen order">
          {items.map((item, index) => (
            <li key={item.id}>
              <span className="sequence-number">{index + 1}</span>
              <strong>{item.label}</strong>
              <span className="sequence-controls">
                <button
                  aria-label={`Move ${item.label} up`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  type="button"
                ><ChevronUp aria-hidden /></button>
                <button
                  aria-label={`Move ${item.label} down`}
                  disabled={index === items.length - 1}
                  onClick={() => move(index, 1)}
                  type="button"
                ><ChevronDown aria-hidden /></button>
              </span>
            </li>
          ))}
        </ol>
      )}

      {task.type === "matching" && (
        <div className="matching-list">
          {task.left.map((left) => (
            <label key={left.id}>
              <span>{left.label}</span>
              <span aria-hidden className="match-arrow">→</span>
              <select
                aria-label={`Match for ${left.label}`}
                onChange={(event) => setPairs((current) => ({
                  ...current,
                  [left.id]: event.target.value,
                }))}
                required
                value={pairs[left.id] ?? ""}
              >
                <option disabled value="">Choose a match</option>
                {task.right.map((right) => (
                  <option key={right.id} value={right.id}>{right.label}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}

      {task.hint && (
        <div className="hint-box">
          <button onClick={() => setHintOpen((open) => !open)} type="button">
            <Lightbulb aria-hidden size={19} />
            {hintOpen ? "Hide hint" : "Need a hint?"}
          </button>
          {hintOpen && <p>{task.hint}</p>}
        </div>
      )}

      {state.message && (
        <div className={`task-feedback ${state.status}`} role={state.status === "error" ? "alert" : "status"}>
          {state.status === "success" ? <CheckCircle2 aria-hidden /> : <RotateCcw aria-hidden />}
          <div>
            <strong>{state.status === "success" && successMessage ? successMessage : state.message}</strong>
            {state.status === "success" && state.awardedPoints !== undefined && (
              <span>+{state.awardedPoints} points</span>
            )}
          </div>
        </div>
      )}

      <button className="button primary answer-submit" disabled={!ready || pending || state.status === "success"} type="submit">
        {pending ? <LoaderCircle aria-hidden className="spin" /> : <ArrowRight aria-hidden />}
        {pending
          ? "Checking…"
          : state.status === "success"
            ? "Quest complete!"
            : task.type === "creative-input"
              ? "Add to my story"
              : "Check my answer"}
      </button>
    </form>
  );
}
