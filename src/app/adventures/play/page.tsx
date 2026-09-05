import Link from "next/link";
import { ChevronLeft, Gem, Star } from "lucide-react";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { ReadAloud } from "@/components/read-aloud";
import { TaskPlayer } from "@/components/task-player";
import { getActiveChildId } from "@/lib/auth";
import { getActiveChildDashboard, type TaskLocation } from "@/lib/game";
import { interpolatePlainText, type TemplateContext } from "@/lib/levels/interpolation";
import type { ClientSafeTask } from "@/lib/levels/client-safe";

function interpolateTask(task: ClientSafeTask, context: TemplateContext): ClientSafeTask {
  const text = (value: string) => interpolatePlainText(value, context);
  switch (task.type) {
    case "multiple-choice":
      return {
        ...task,
        prompt: text(task.prompt),
        ...(task.hint ? { hint: text(task.hint) } : {}),
        options: task.options.map((option) => ({ ...option, label: text(option.label) })),
      };
    case "sequence":
      return {
        ...task,
        prompt: text(task.prompt),
        ...(task.hint ? { hint: text(task.hint) } : {}),
        items: task.items.map((item) => ({ ...item, label: text(item.label) })),
      };
    case "matching":
      return {
        ...task,
        prompt: text(task.prompt),
        ...(task.hint ? { hint: text(task.hint) } : {}),
        left: task.left.map((item) => ({ ...item, label: text(item.label) })),
        right: task.right.map((item) => ({ ...item, label: text(item.label) })),
      };
    default:
      return {
        ...task,
        prompt: text(task.prompt),
        ...(task.hint ? { hint: text(task.hint) } : {}),
      };
  }
}

export default async function PlayPage() {
  if (!(await getActiveChildId())) redirect("/");
  const dashboard = await getActiveChildDashboard();
  if (!dashboard.resume || !dashboard.currentLevel) redirect("/adventures");

  const { resume, currentLevel } = dashboard;
  const quest = currentLevel.quests.find((candidate) => candidate.id === resume.questId);
  const part = quest?.parts.find((candidate) => candidate.id === resume.partId);
  const rawTask = part?.tasks.find((candidate) => candidate.id === resume.taskId);
  if (!quest || !part || !rawTask) redirect("/adventures");

  const context: TemplateContext = {
    hero: { name: dashboard.child.displayName },
    sidekicks: dashboard.child.sidekickNames.length
      ? [...dashboard.child.sidekickNames, ...Array(12).fill("a trusty sidekick")]
      : Array(12).fill("a trusty sidekick"),
    answers: dashboard.variables,
  };
  const text = (value: string) => interpolatePlainText(value, context);
  const task = interpolateTask(rawTask, context);
  const tasks = currentLevel.quests.flatMap((entryQuest) =>
    entryQuest.parts.flatMap((entryPart) => entryPart.tasks));
  const taskIndex = Math.max(0, tasks.findIndex((candidate) => candidate.id === task.id));
  const location: TaskLocation = {
    levelId: resume.levelId,
    questId: resume.questId,
    partId: resume.partId,
    taskId: resume.taskId,
  };
  const isLastInPart = part.tasks.at(-1)?.id === task.id;
  const readText = [
    text(currentLevel.introduction),
    text(quest.title),
    text(part.narrative),
    task.prompt,
  ].join(". ");

  return (
    <main className="play-page">
      <header className="play-header">
        <Link className="back-link" href="/adventures">
          <ChevronLeft aria-hidden /> Story map
        </Link>
        <div className="play-level">
          <strong>Level {currentLevel.levelNumber}</strong>
          <span>{currentLevel.title}</span>
        </div>
        <div className="play-scores">
          <span><Star aria-hidden fill="currentColor" /> {dashboard.totals.stars}</span>
          <span><Gem aria-hidden /> {dashboard.totals.points}</span>
        </div>
      </header>
      <div className="progress-track" aria-label={`Task ${taskIndex + 1} of ${tasks.length}`}>
        <span style={{ transform: `scaleX(${(taskIndex + 1) / tasks.length})` }} />
      </div>

      <article className="quest-stage">
        <div className="quest-companion">
          <Avatar avatarKey={dashboard.child.avatarKey} size="medium" />
          <span>{dashboard.child.displayName}’s quest</span>
        </div>
        <div className="quest-heading">
          <div>
            <p>{text(quest.title)} · {text(part.title)}</p>
            <h1>{task.prompt}</h1>
          </div>
          <ReadAloud text={readText} />
        </div>
        <div className="story-scroll">
          <span aria-hidden>❦</span>
          <p>{text(part.narrative)}</p>
        </div>
        <TaskPlayer
          key={task.id}
          location={location}
          successMessageTemplate={isLastInPart ? part.reward.message : undefined}
          task={task}
          templateContext={context}
        />
      </article>
    </main>
  );
}
