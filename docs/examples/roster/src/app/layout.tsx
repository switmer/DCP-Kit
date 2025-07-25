import type { Metadata } from "next";
import {
  DM_Sans as FontSans,
  Instrument_Serif as FontSerif,
  Manrope as FontPrimary,
  IBM_Plex_Sans as FontLabel,
} from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SignInProvider } from "@/lib/sign-in-context";
import { Toaster } from "@/components/ui/Sonner";

import { UppyProvider } from "@/lib/uppy";
import React from "react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ReactQueryClientProvider } from "@/lib/reactQueryClientProvider";
import { SheetProgress } from "@/components/blocks/SheetProgress";
import { PHProvider } from "@/posthog";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontPrimary = FontPrimary({
  subsets: ["latin"],
  variable: "--font-primary",
});

const fontSerif = FontSerif({
  weight: "400",
  style: "italic",
  subsets: ["latin"],
  variable: "--font-serif",
  adjustFontFallback: false,
});

const fontLabel = FontLabel({
  variable: "--font-label",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Roster",
  description: "",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ReactQueryClientProvider>
      <html lang="en">
        <PHProvider>
          <body
            className={cn(
              "min-h-screen bg-background font-sans antialiased",
              fontSans.variable,
              fontSerif.variable,
              fontPrimary.variable,
              fontLabel.variable
            )}
          >
            <SignInProvider>
              <UppyProvider>{children}</UppyProvider>
              <SheetProgress />
            </SignInProvider>
            <Toaster />
            <ProgressBar />
          </body>
        </PHProvider>
      </html>
    </ReactQueryClientProvider>
  );
}
