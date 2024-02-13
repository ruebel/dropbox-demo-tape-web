import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header/Header";
import { Audio } from "@/components/Audio";
import { Provider } from "jotai";
import { AudioControls } from "@/components/AudioControls/AudioControls";
import { FullAudioDetails } from "@/components/FullAudioDetails/FullAudioDetails";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Demo Tape",
  description: "Dropbox Demo Tape",
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
            <Header />
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
