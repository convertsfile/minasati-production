import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "https://6e0dfbd037b9c1f74a011b862dcbcd7f@o4511581323132928.ingest.de.sentry.io/4511581618765904",

  enableLogs: true,
  tracesSampleRate: 1.0,
  dataCollection: {},
});
