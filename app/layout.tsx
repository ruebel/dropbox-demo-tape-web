import { Audio } from "@/components/Audio";
import { AudioControls } from "@/components/AudioControls/AudioControls";
import { FullAudioDetails } from "@/components/FullAudioDetails/FullAudioDetails";
import { Header } from "@/components/Header/Header";
import { Provider } from "jotai";
import { Inter } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Demo Tape",
  description: "Dropbox Demo Tape",
};

export const viewport: Viewport = {
  // Colors the browser toolbar on phones to match the header
  themeColor: "#2D323C",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Provider>
          <main>
            <Suspense fallback={null}>
              <Header />
            </Suspense>
            <Audio />
            <div id="body">{children}</div>
            <AudioControls />
            <FullAudioDetails />
          </main>
        </Provider>
      </body>
    </html>
  );
}
