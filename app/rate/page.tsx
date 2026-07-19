import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { SmartRateClient } from "@/components/rate/smart-rate-client";

export const metadata = { title: "Smart Rating" };

export default function RatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-waku-cinematic" />
        </div>
      }
    >
      <SmartRateClient />
    </Suspense>
  );
}
