"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { useCloudSync } from "@/lib/supabase/sync";
import { RatingPrompt } from "@/components/media/rating-prompt";

function CloudSync() {
  useCloudSync();
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            refetchOnWindowFocus: false,
            retry: 1,
            // Waku only fetches read-only public data; never pause on the
            // browser's (sometimes unreliable) online/offline signal.
            networkMode: "always",
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <CloudSync />
      {children}
      <RatingPrompt />
    </QueryClientProvider>
  );
}
