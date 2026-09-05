import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Skill Saga",
    short_name: "Skill Saga",
    description: "Whimsical learning adventures for young heroes.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f5ff",
    theme_color: "#7867c9",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
