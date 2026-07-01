// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://0af35a147fe5cabd50ce74bdd0d6a308@o4511658696310784.ingest.us.sentry.io/4511658704306176",

  // Identify this app within the shared Sentry project.
  initialScope: {
    tags: { app: "supersdeck" },
  },

  // Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
