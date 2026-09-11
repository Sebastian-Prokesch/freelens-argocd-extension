import { useEffect, useState } from "react";

const POLL_INTERVAL_MS = 15_000;

export function useArgoCdApiQuery<T>(enabled: boolean, queryKey: string, query: () => Promise<T>) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setData(undefined);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const run = async (withLoading: boolean) => {
      if (withLoading) {
        setIsLoading(true);
      }

      try {
        const result = await query();
        if (cancelled) {
          return;
        }
        setData(result);
        setError(null);
        setIsLoading(false);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : "Argo CD API request failed.");
        setIsLoading(false);
      }
    };

    void run(true);
    const intervalId = window.setInterval(() => {
      void run(false);
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [enabled, queryKey]);

  return { data, isLoading, error };
}
