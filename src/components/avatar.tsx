import { AVATARS } from "@/lib/game/avatars";

export function Avatar({
  avatarKey,
  size = "medium",
}: {
  avatarKey: string;
  size?: "small" | "medium" | "large";
}) {
  const avatar = AVATARS.find((candidate) => candidate.key === avatarKey) ?? AVATARS[0];
  return (
    <span
      aria-label={`${avatar.label} avatar`}
      className={`avatar avatar-${size}`}
      role="img"
    >
      {avatar.emoji}
    </span>
  );
}
