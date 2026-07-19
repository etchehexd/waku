"use client";

import { useState } from "react";
import { Cloud, LogOut, Loader2, Mail, Lock, CheckCircle2 } from "lucide-react";
import { useWakuAuth } from "@/lib/supabase/sync";
import { useMounted } from "@/lib/use-mounted";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function AccountCard() {
  const mounted = useMounted();
  const { enabled, user, loading, signIn, signUp, signInWithGoogle, signOut } = useWakuAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [confirmOut, setConfirmOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const doSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    setConfirmOut(false);
  };

  if (!mounted) return null;

  // Cloud sync isn't configured for this deployment. Waku works fully on local
  // storage, so there is nothing for the user to act on — we render nothing
  // rather than a dead "sync is off" notice. The sync engine itself
  // (useCloudSync / useWakuAuth) is untouched and still no-ops safely.
  if (!enabled) return null;

  if (user) {
    return (
      <>
        <div className="glass glass-sheen rounded-3xl p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
              <Cloud className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">
                Signed in as
              </p>
              <p className="truncate text-sm font-medium text-white">{user.email}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-emerald-300/80">
                <CheckCircle2 className="h-3 w-3 shrink-0" />
                Library, ratings &amp; rankings synced to the cloud
              </p>
            </div>
          </div>

          {/* Sign out gets its own full-width, clearly-labelled action rather
              than a cramped corner button — it's the one destructive control
              here, so it's separated and confirmed. */}
          <div className="mt-4 border-t border-white/8 pt-3">
            <Button
              variant="outline"
              size="md"
              className="w-full sm:w-auto"
              onClick={() => setConfirmOut(true)}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>

        <ConfirmDialog
          open={confirmOut}
          destructive
          busy={signingOut}
          title="Sign out of Waku?"
          description={
            <>
              Your library stays on this device and will sync again next time you sign in.
              Cloud sync will stop until then.
            </>
          }
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
  };

  return (
    <form onSubmit={submit} className="glass glass-sheen rounded-3xl p-4">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-waku-500/20 text-waku-cinematic">
          <Cloud className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">
            {mode === "in" ? "Sign in to sync" : "Create an account"}
          </p>
          <p className="text-xs text-white/45">Back up your library, ratings & rankings.</p>
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-white/40" />}
      </div>

      {/* Google — the fastest path; wired via Supabase OAuth. */}
      <button
        type="button"
        onClick={async () => {
          setBusy(true);
          setMsg(null);
          const { error } = await signInWithGoogle();
          // On success the browser redirects to Google, so we only land here on error.
          if (error) setMsg(error);
          setBusy(false);
        }}
        disabled={busy}
        className="flex h-10 w-full items-center justify-center gap-2.5 rounded-full bg-white text-sm font-semibold text-[#1f1f1f] outline-none transition-transform hover:scale-[1.01] focus-visible:ring-2 focus-visible:ring-waku-400 disabled:opacity-60"
      >
        <GoogleIcon className="h-4 w-4" />
        Continue with Google
      </button>

      <div className="my-3 flex items-center gap-3 text-[11px] uppercase tracking-wider text-white/30">
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
            className="input-field h-10 pl-10 pr-3 text-sm"
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
            className="input-field h-10 pl-10 pr-3 text-sm"
          />
        </div>
      </div>

      {msg && <p className="mt-2 text-xs text-rose-300">{msg}</p>}
      {ok && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" /> {ok}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <Button type="submit" variant="primary" size="sm" disabled={busy} className="flex-1">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "in" ? "Sign in" : "Sign up"}
        </Button>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "in" ? "up" : "in");
            setMsg(null);
            setOk(null);
          }}
          className="text-xs text-white/50 underline-offset-4 hover:text-white hover:underline"
        >
          {mode === "in" ? "Need an account?" : "Have one? Sign in"}
        </button>
      </div>
    </form>
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
