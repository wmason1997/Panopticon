"use client";

import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, useState } from "react";
import { ToastProvider, useToast } from "@/components/Toast";

/** Subscribes to all mutation errors and surfaces them as toasts. */
function GlobalErrorHandler() {
  const { toast } = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    return qc.getMutationCache().subscribe((event) => {
      if (
        event.type === "updated" &&
        event.mutation?.state.status === "error"
      ) {
        const err = event.mutation.state.error;
        const message =
          err instanceof Error ? err.message : "something went wrong";
        // Skip auth errors — the page already redirects on 401
        if (err && "status" in (err as object) && (err as { status: number }).status === 401) return;
        toast(message, "error");
      }
    });
  }, [qc, toast]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount, error) => {
              // Don't retry 4xx errors
              if (error instanceof Error && "status" in error) {
                const status = (error as { status: number }).status;
                if (status >= 400 && status < 500) return false;
              }
              return failureCount < 2;
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <ToastProvider>
        <GlobalErrorHandler />
        {children}
      </ToastProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
