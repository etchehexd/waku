import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WakuMark } from "@/components/layout/logo";

export default function NotFound() {
  return (
    <div className="container flex min-h-[70vh] flex-col items-center justify-center text-center">
      <WakuMark className="h-16 w-16 animate-float" />
      <h1 className="mt-6 font-display text-5xl font-bold text-gradient">404</h1>
      <p className="mt-2 max-w-sm text-white/55">
        This title drifted off into another dimension. Let’s get you back.
      </p>
      <Link href="/" className="mt-6">
        <Button variant="primary" size="lg">
          Back home
        </Button>
      </Link>
    </div>
  );
}
