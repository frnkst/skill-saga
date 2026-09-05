export const AVATARS = [
  { key: "fox", label: "Fox", emoji: "🦊" },
  { key: "owl", label: "Owl", emoji: "🦉" },
  { key: "dragon", label: "Dragon", emoji: "🐉" },
  { key: "cat", label: "Cat", emoji: "🐱" },
  { key: "rabbit", label: "Rabbit", emoji: "🐰" },
  { key: "bear", label: "Bear", emoji: "🐻" },
] as const;

export type AvatarKey = (typeof AVATARS)[number]["key"];
export const AVATAR_KEYS = AVATARS.map((avatar) => avatar.key) as [AvatarKey, ...AvatarKey[]];
