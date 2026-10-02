import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import { SITE_URL, SOURCE_URL } from "@/lib/config";
import "./globals.css";

const grotesk = Archivo({ variable: "--font-grotesk", subsets: ["latin"], axes: ["wdth"] });
const mono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Underhood — what does this company run on?", template: "%s · Underhood" },
  description: "See what any company runs on, from its public footprint: headers, HTML, DNS, SPF and TXT records.",
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${grotesk.variable} ${mono.variable} min-h-dvh`}>
        <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 sm:px-6">
          <header className="flex items-center justify-between border-b-2 border-rule-strong py-3 font-mono text-xs">
            <Link href="/" className="font-semibold tracking-[0.2em] uppercase hover:text-accent">
              Underhood
            </Link>
            <span className="text-muted">public-footprint teardown · v0.1</span>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="mt-16 flex flex-wrap justify-between gap-x-6 gap-y-2 border-t border-rule py-4 font-mono text-[11px] text-muted">
            <span>Public signals only: headers, HTML, cookie names, DNS, IP owner.</span>
            <nav className="flex gap-4">
              <Link href="/findings" className="hover:text-accent">Findings</Link>
              <Link href="/about" className="hover:text-accent">About &amp; opt-out</Link>
              <a href={SOURCE_URL} className="hover:text-accent">Source</a>
            </nav>
          </footer>
        </div>
      </body>
    </html>
  );
}
