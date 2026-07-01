"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl2 border border-ink-200 bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-50 text-xl text-danger-600">
          !
        </div>
        <h1 className="text-lg font-semibold text-ink-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-ink-600">
          An unexpected error occurred. You can try again — if it keeps happening,
          reload the page.
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
