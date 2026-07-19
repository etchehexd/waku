"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container flex min-h-[70vh] flex-col items-center justify-center text-center">
      <h1 className="font-display text-3xl font-bold text-white">Something glitched</h1>
      <p className="mt-2 max-w-sm text-white/55">
        We couldn’t load this just now. Give it another go in a moment.
      </p>
      <Button variant="primary" size="lg" className="mt-6" onClick={reset}>
        <RefreshCw className="h-4 w-4" /> Try again
      </Button>
    </div>
  );
}
