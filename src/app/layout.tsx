import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { UiFeedback } from "@/components/ui-feedback";
import { AuthProvider } from "@/components/auth-provider";

const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "Language Islands",
  description: "Build vocabulary in meaningful, memorable contexts.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${display.variable}`}><UiFeedback><AuthProvider>{children}</AuthProvider></UiFeedback></body>
    </html>
  );
}
