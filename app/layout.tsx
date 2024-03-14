import { Audio } from "@/components/Audio";
import { AudioControls } from "@/components/AudioControls/AudioControls";
import { FullAudioDetails } from "@/components/FullAudioDetails/FullAudioDetails";
import { Header } from "@/components/Header/Header";
import { Provider } from "jotai";
import { Inter } from "next/font/google";
import { Metadata } from "next/types";
import { Suspense } from "react";
import "./globals.css";

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
