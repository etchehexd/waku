"use client";

import { useState } from "react";
import { Settings, Palette, LogOut, Cloud } from "lucide-react";
import { Sheet, SheetSection } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useWakuAuth } from "@/lib/supabase/sync";
import { PaletteGrid } from "./theme-picker";

/**
 * A compact Settings button (for the profile header) that opens a sheet holding
 * appearance + account settings — the accent-palette picker and a sign-out.
 * Keeps these out of the main profile flow so they don't eat vertical space.
 */
export function SettingsSheet() {
  const [open, setOpen] = useState(false);
  const { enabled, user, signOut } = useWakuAuth();
  const [confirmOut, setConfirmOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const doSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    setConfirmOut(false);
    setOpen(false);
  };

  return (
    <>
      <Button variant="glass" size="sm" onClick={() => setOpen(true)}>
        <Settings className="h-3.5 w-3.5" /> Settings
      </Button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        label="Settings"
        header={
          <div className="flex items-center gap-2.5 border-b border-white/8 p-5 pr-14">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-iris-500/15 text-iris-300 ring-1 ring-inset ring-iris-400/25">
              <Settings className="h-4 w-4" />
            </span>
            <h2 className="font-display text-base font-semibold text-white">Settings</h2>
          </div>
        }
        footer={
          <Button variant="primary" size="md" className="w-full" onClick={() => setOpen(false)}>
            Done
          </Button>
        }
      >
        <SheetSection title="Accent palette">
          <p className="mb-3 text-sm text-white/45">
            <Palette className="mr-1 inline h-3.5 w-3.5 align-[-2px] text-waku-cinematic" />
            Re-tints the whole app. Saved on this device.
          </p>
          <PaletteGrid />
        </SheetSection>

        {/* Account / sign-out — only meaningful when cloud sync is signed in. */}
        {enabled && user && (
          <>
            <div className="mx-5 h-px bg-white/[0.07]" />
            <SheetSection title="Account">
              <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3 ring-1 ring-inset ring-white/8">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                  <Cloud className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">Signed in as</p>
                  <p className="truncate text-sm font-medium text-white">{user.email}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="md"
                className="mt-2.5 w-full"
                onClick={() => setConfirmOut(true)}
              >
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </SheetSection>
          </>
        )}
      </Sheet>

      <ConfirmDialog
        open={confirmOut}
        destructive
        busy={signingOut}
        title="Sign out of Waku?"
        description="Your library stays on this device and will sync again next time you sign in. Cloud sync will stop until then."
        confirmLabel={signingOut ? "Signing out…" : "Sign out"}
        cancelLabel="Stay signed in"
        onConfirm={doSignOut}
        onCancel={() => setConfirmOut(false)}
      />
    </>
  );
}
