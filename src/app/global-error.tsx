"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // TODO: wire Sentry.captureException(error)
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          margin: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f7f7f6",
          color: "#1a1a18",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Inter, sans-serif',
          padding: "1rem",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "28rem",
            borderRadius: "14px",
            border: "1px solid #d8d8d4",
            background: "#fff",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              margin: "0 auto 1rem",
              display: "flex",
              height: "3rem",
              width: "3rem",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "9999px",
              background: "#fdecec",
              color: "#c03030",
              fontSize: "1.25rem",
            }}
          >
            !
          </div>
          <h1 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#5b5b56" }}>
            An unexpected error occurred. You can try again — if it keeps
            happening, reload the page.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              borderRadius: "0.375rem",
              border: "none",
              background: "#2f5fd6",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      </body>
    </html>
  );
}
