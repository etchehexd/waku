import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { DiscoverClient } from "@/components/discover/discover-client";

export const metadata = { title: "Discover" };

export default function DiscoverPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-waku-cinematic" />
        </div>
      }
    >
      <DiscoverClient />
    </Suspense>
  );
}
