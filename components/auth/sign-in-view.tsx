"use client";

import { useState } from "react";
import { Loader2, Mail, Lock, CheckCircle2, Sparkles } from "lucide-react";
import { useWakuAuth } from "@/lib/supabase/sync";
import { Button } from "@/components/ui/button";

/**
 * The full-page sign-in experience. Rendered as the ENTIRE Profile page while
 * signed out (no profile box, no stats) — it becomes the profile once the user
 * signs in. Deliberately a normal centered layout, not a modal/sheet, so it can
 * never be clipped or sit behind another surface.
 */
export function SignInView() {
  const { signIn, signUp, signInWithGoogle } = useWakuAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setOk(null);
    const fn = mode === "in" ? signIn : signUp;
    const { error } = await fn(email.trim(), password);
    setBusy(false);
    if (error) setMsg(error);
    else if (mode === "up") setOk("Check your inbox to confirm, then sign in.");
    // On successful sign-in the auth listener re-renders the page into the profile.
  };

  const google = async () => {
    setBusy(true);
    setMsg(null);
    const { error } = await signInWithGoogle();
    if (error) setMsg(error);
    setBusy(false);
  };

  return (
    <div className="container flex min-h-[calc(100dvh-3.5rem)] items-center justify-center py-16">
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="mb-8 text-center">
          <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-waku-400 to-iris-600 text-white shadow-glow">
            <Sparkles className="h-5 w-5" />
          </span>
          <h1 className="font-display text-2xl font-bold text-white">
            {mode === "in" ? "Sign in to Waku" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Track your library, ratings &amp; rankings — synced across every device.
          </p>
        </div>

        <div className="glass glass-sheen rounded-3xl p-5 sm:p-6">
          <button
            type="button"
            onClick={google}
            disabled={busy}
            className="flex h-11 w-full items-center justify-center gap-2.5 rounded-full bg-white text-sm font-semibold text-[#1f1f1f] outline-none transition-transform hover:scale-[1.01] focus-visible:ring-2 focus-visible:ring-waku-400 disabled:opacity-60"
          >
            <GoogleIcon className="h-4 w-4" />
            Continue with Google
          </button>

          <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wider text-white/30">
            <span className="h-px flex-1 bg-white/10" />
            or
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={submit} className="space-y-2.5">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                autoComplete="email"
                className="input-field h-11 rounded-2xl pl-10 pr-3 text-sm"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete={mode === "in" ? "current-password" : "new-password"}
                className="input-field h-11 rounded-2xl pl-10 pr-3 text-sm"
              />
            </div>

            {msg && <p className="text-xs text-rose-300">{msg}</p>}
            {ok && (
              <p className="flex items-center gap-1.5 text-xs text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" /> {ok}
              </p>
            )}

            <Button type="submit" variant="accent" size="lg" disabled={busy} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "in" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "in" ? "up" : "in");
              setMsg(null);
              setOk(null);
            }}
            className="mt-4 block w-full text-center text-xs text-white/50 outline-none underline-offset-4 hover:text-white hover:underline focus-visible:ring-2 focus-visible:ring-waku-400"
          >
            {mode === "in" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Google "G" logo mark (official four-color), inline so it needs no asset. */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M23.52 12.27c0-.86-.08-1.68-.22-2.47H12v4.68h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.87c2.26-2.09 3.59-5.17 3.59-8.83Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.94-2.9l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.28v3.09A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.28a12 12 0 0 0 0 10.76l3.99-3.09Z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.62l3.99 3.09C6.22 6.86 8.87 4.75 12 4.75Z" />
    </svg>
  );
}
