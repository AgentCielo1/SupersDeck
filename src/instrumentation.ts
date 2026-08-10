import * as Sentry from "@sentry/nextjs";
import { assertProductionEnv } from "@/lib/production-env";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Before anything else: refuse to come up in production with a security
    // guard silently switched off. Throwing here fails the instance rather than
    // serving traffic with an open anonymous endpoint. See production-env.ts.
    assertProductionEnv();

    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
