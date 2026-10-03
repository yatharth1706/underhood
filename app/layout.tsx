import type { Metadata } from "next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SITE_URL, SOURCE_URL } from "@/lib/config";
import "./globals.css";

const sans = Instrument_Sans({ variable: "--font-instrument", subsets: ["latin"], axes: ["wdth"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Underhood — what does this company run on?", template: "%s · Underhood" },
  description: "See what any company runs on, from its public footprint: headers, HTML, DNS, SPF and TXT records.",
  twitter: { card: "summary_large_image" },
};

/** Apply a saved theme before first paint; with none saved, CSS follows the system. */
const THEME_SCRIPT = `try{var t=localStorage.getItem("underhood:theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${sans.variable} ${mono.variable} min-h-dvh`}>
        <div className="mx-auto flex min-h-dvh max-w-[1240px] flex-col px-4 pt-4 sm:px-5">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <footer className="mt-14 flex flex-wrap justify-between gap-x-6 gap-y-2 border-t border-rule px-1 py-[18px] text-[13px] text-muted">
            <span>Public signals only: headers, HTML, cookie names, DNS, IP owner.</span>
            <nav className="flex gap-[18px]">
              <a href="/api/scan?domain=linear.app" className="hover:text-ink">API</a>
              <Link href="/about" className="hover:text-ink">About &amp; opt-out</Link>
              <a href={SOURCE_URL} className="hover:text-ink">Source</a>
            </nav>
          </footer>
        </div>
      </body>
    </html>
  );
}
