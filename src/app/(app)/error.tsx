"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto mt-16 max-w-md space-y-3 rounded-md border bg-card p-6 text-center">
      <h1 className="text-lg font-semibold">This page could not load</h1>
      <p className="text-sm text-muted-foreground">
        Nothing you stamped was lost. Every completed cell is saved the moment you stamp it. Try loading
        the page again.
      </p>
      <Button onClick={() => retry()}>Try again</Button>
    </div>
  );
}
