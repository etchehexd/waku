import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/layout/navbar";
import { OrnamentBackdrop } from "@/components/layout/ornament-backdrop";
import { ThemeApplier } from "@/components/layout/theme-applier";
import { THEME_STORAGE_KEY, DEFAULT_PALETTE } from "@/lib/theme";

// One clean, modern grotesque-humanist family for the whole app — used for both
// body and display so the type reads cohesive and distinctive (not the default
// Inter/SaaS look). Its var feeds both --font-sans and --font-display.
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Waku — Track anime & manga, beautifully",
    template: "%s · Waku",
  },
  description:
    "Waku is a cinematic anime, manga & light-novel tracker with Smart Rating, personal rankings, and a Liquid-Glass interface.",
  keywords: ["anime", "manga", "light novel", "tracker", "ratings"],
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#05070f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${manrope.variable} dark`} suppressHydrationWarning>
      <head>
        {/* Apply the saved accent palette before first paint to avoid a flash
            of the default theme. Mirrors lib/theme.ts (zustand persist shape). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem(${JSON.stringify(
              THEME_STORAGE_KEY,
            )});var p=s?JSON.parse(s).state.palette:${JSON.stringify(
              DEFAULT_PALETTE,
            )};if(p)document.documentElement.dataset.palette=p;}catch(e){document.documentElement.dataset.palette=${JSON.stringify(
              DEFAULT_PALETTE,
            )};}})();`,
          }}
        />
      </head>
      <body className="min-h-screen font-sans">
        <Providers>
          <ThemeApplier />
          <OrnamentBackdrop />
          <Navbar />
          <main className="pb-24 pt-14 md:pb-16 md:pt-0">{children}</main>
          <footer className="border-t border-white/5 py-10 text-center text-xs text-white/35">
            <p>Waku · Made with 青い炎</p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
