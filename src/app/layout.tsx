import type { Metadata } from "next";
import { Manrope, Orbitron } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope"
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron"
});

export const metadata: Metadata = {
  title: "F1 Punishment Tracker",
  description: "Private F1 fantasy punishment league tracker"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${manrope.variable} ${orbitron.variable}`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
