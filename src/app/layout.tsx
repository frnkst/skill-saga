import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Skill Saga", template: "%s · Skill Saga" },
  description: "Whimsical learning adventures for young heroes.",
  applicationName: "Skill Saga",
};

export const viewport: Viewport = {
  themeColor: "#7867c9",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={geist.variable}>
      <body>{children}</body>
    </html>
  );
}
