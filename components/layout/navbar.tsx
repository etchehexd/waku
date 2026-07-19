"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Compass, Library, Trophy, CalendarDays, User } from "lucide-react";
import { useWaku } from "@/lib/store";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/library", label: "Library", icon: Library },
  { href: "/rankings", label: "Rankings", icon: Trophy },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
];

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const mounted = useMounted();
  const avatar = useWaku((s) => s.profile.avatar);
  const displayName = useWaku((s) => s.profile.displayName);
  const showAvatar = mounted && !!avatar;
  const initial = displayName?.charAt(0).toUpperCase() || "";

  useEffect(() => {
    // rAF-throttled with hysteresis: compact past 48px, expand again only
    // under 12px. One state per frame at most, and no flip-flopping when the
    // page rests exactly on a threshold.
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setScrolled((prev) => (prev ? window.scrollY > 12 : window.scrollY > 48));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // Shared height so logo, nav pill and profile line up exactly; the scrolled
  // state is a significantly more compact, icon-first chrome.
  const h = scrolled ? "h-8" : "h-10";
  const trans = "transition-all duration-300 ease-out motion-reduce:transition-none";

  return (
    <>
      {/* Desktop / tablet — logo, nav pill and profile are three separate
          floating glass elements that shrink together on scroll. */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 hidden md:block">
        <div
          className={cn(
            // margin (not padding) for the top gap so the flex line has no
            // padding box — that lets the absolutely-centered nav pill share the
            // exact same vertical center as the logo and profile pills.
            "container relative flex items-center justify-between",
            trans,
            scrolled ? "mt-2" : "mt-3",
          )}
        >
          {/* Logo — its own pill, left */}
          <Link
            href="/"
            className={cn(
              "glass glass-sheen pointer-events-auto flex items-center rounded-full px-3.5",
              h,
              trans,
            )}
          >
            <Logo compact={scrolled} />
          </Link>

          {/* Centered nav pill */}
          <nav
            className={cn(
              "glass glass-sheen pointer-events-auto absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-0.5 rounded-full px-1.5",
              h,
              trans,
            )}
          >
            {NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  // Icon-only when compact — the label survives for assistive tech.
                  aria-label={item.label}
                  title={scrolled ? item.label : undefined}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-full py-1 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-waku-400",
                    scrolled ? "px-2" : "px-3",
                    active ? "text-white" : "text-white/60 hover:text-white",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-gradient-to-b from-iris-500/25 to-waku-500/20 ring-1 ring-inset ring-iris-300/30"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <item.icon className={cn("shrink-0", scrolled ? "h-4 w-4" : "h-4 w-4")} />
                  <span className={cn(scrolled && "sr-only")}>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Profile — its own button, right (square, matches nav height).
              Shows the uploaded avatar once set, else a neutral icon. */}
          <Link
            href="/profile"
            className={cn(
              "glass glass-sheen pointer-events-auto flex aspect-square items-center justify-center overflow-hidden rounded-full text-white transition-transform hover:scale-105",
              h,
              trans,
            )}
            aria-label="Profile"
          >
            {showAvatar ? (
              <Image
                src={avatar!}
                alt=""
                width={40}
                height={40}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className={cn(scrolled ? "h-4 w-4" : "h-[18px] w-[18px]")} />
            )}
          </Link>
        </div>
      </header>

      {/* Mobile top logo bar — compacts with scroll like the desktop chrome */}
      <header className="fixed inset-x-0 top-0 z-50 md:hidden">
        <div
          className={cn(
            "glass-chrome flex items-center justify-between px-4",
            trans,
            scrolled ? "h-11" : "h-14",
          )}
        >
          <Link href="/" className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-waku-400">
            <Logo compact={scrolled} />
          </Link>
          <Link
            href="/profile"
            className={cn(
              "flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-iris-400 to-waku-600 text-white outline-none focus-visible:ring-2 focus-visible:ring-waku-400",
              trans,
              scrolled ? "h-7 w-7" : "h-9 w-9",
            )}
            aria-label="Profile"
          >
            {showAvatar ? (
              <Image src={avatar!} alt="" width={36} height={36} className="h-full w-full object-cover" />
            ) : initial ? (
              <span className={cn("font-bold", scrolled ? "text-xs" : "text-sm")}>{initial}</span>
            ) : (
              <User className={cn(trans, scrolled ? "h-4 w-4" : "h-5 w-5")} />
            )}
          </Link>
        </div>
      </header>

      {/* Mobile bottom glass tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-50 md:hidden">
        <div className="glass-chrome flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-1.5">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[10px] font-medium transition-colors",
                  active ? "text-waku-cinematic" : "text-white/55",
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
