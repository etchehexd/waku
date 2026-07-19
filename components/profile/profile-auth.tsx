"use client";

import { useState } from "react";
import { LogIn, LogOut, Loader2, Mail, Lock, CheckCircle2 } from "lucide-react";
import { useWakuAuth } from "@/lib/supabase/sync";
import { useMounted } from "@/lib/use-mounted";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Auth control for the profile header strip.
 *
 * Signed out → a "Sign in" button that opens a sheet (Google + email/password).
 * Signed in  → a compact "signed in as …" line lives in the header (see the
 *              profile page); here we render the "Sign out" action.
 *
 * Renders nothing when Supabase isn't configured, so the local-only app is
 * unaffected.
 */
export function ProfileAuth() {
  const mounted = useMounted();
  const { enabled, user, loading, signIn, signUp, signInWithGoogle, signOut } = useWakuAuth();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [confirmOut, setConfirmOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (!mounted || !enabled) return null;
  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-white/40" />;

  if (user) {
    const doSignOut = async () => {
      setSigningOut(true);
      await signOut();
      setSigningOut(false);
      setConfirmOut(false);
    };
    return (
      <>
        <Button variant="outline" size="sm" onClick={() => setConfirmOut(true)}>
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </Button>
        <ConfirmDialog
          open={confirmOut}
          destructive
          busy={signingOut}
          title="Sign out of Waku?"
          description="Your library stays on this device and syncs again next time you sign in."
          confirmLabel={signingOut ? "Signing out…" : "Sign out"}
          cancelLabel="Stay signed in"
          onConfirm={doSignOut}
          onCancel={() => setConfirmOut(false)}
        />
      </>
    );
  }

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
    else setOpen(false); // signed in — onAuthStateChange updates the header
  };

  const google = async () => {
    setBusy(true);
    setMsg(null);
    const { error } = await signInWithGoogle();
    if (error) setMsg(error);
    setBusy(false);
  };

  return (
    <>
      <Button variant="accent" size="sm" onClick={() => setOpen(true)}>
        <LogIn className="h-3.5 w-3.5" /> Sign in
      </Button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        label="Sign in to Waku"
        header={
          <div className="border-b border-white/8 p-5 pr-14">
            <h2 className="font-display text-lg font-semibold text-white">
              {mode === "in" ? "Sign in" : "Create an account"}
            </h2>
            <p className="mt-1 text-sm text-white/50">
              Back up your library, ratings &amp; rankings across devices.
            </p>
          </div>
        }
      >
        <form onSubmit={submit} className="p-5">
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

          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="input-field h-11 pl-10 pr-3 text-sm"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="input-field h-11 pl-10 pr-3 text-sm"
              />
            </div>
          </div>

          {msg && <p className="mt-2 text-xs text-rose-300">{msg}</p>}
          {ok && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" /> {ok}
            </p>
          )}

          <Button type="submit" variant="primary" size="md" disabled={busy} className="mt-4 w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "in" ? "Sign in" : "Create account"}
          </Button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "in" ? "up" : "in");
              setMsg(null);
              setOk(null);
            }}
            className="mt-3 block w-full text-center text-xs text-white/50 underline-offset-4 hover:text-white hover:underline"
          >
            {mode === "in" ? "Need an account? Sign up" : "Have an account? Sign in"}
          </button>
        </form>
      </Sheet>
    </>
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
