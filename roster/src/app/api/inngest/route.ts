import { crewingContactAttempt } from "@/inngest/functions/crewing-contact-attempt";
import { crewingContactAttemptQueue } from "@/inngest/functions/crewing-contact-attempt-queue";
import { crewingContactAttemptResponse } from "@/inngest/functions/crewing-contact-attempt-response";
import { parseCallSheet } from "@/inngest/functions/parse-sheet";
import { processCrew } from "@/inngest/functions/process-crew";
import { processCallSheet } from "@/inngest/functions/process-result";
import { pushCallNotification } from "@/inngest/functions/push-call-notification";
import { enrichSheet } from "@/inngest/functions/enrich-sheet";
import { expireParsingSheets } from "@/inngest/functions/expire-parsing-sheets";
import { inngest } from "@/inngest/inngest.client";
import { serve } from "inngest/next";
import { reparseCallSheet } from "@/inngest/functions/reparse-sheet";

export const runtime = "edge";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    parseCallSheet,
    reparseCallSheet,
    processCallSheet,
    processCrew,
    crewingContactAttempt,
    crewingContactAttemptResponse,
    crewingContactAttemptQueue,
    pushCallNotification,
    enrichSheet,
    expireParsingSheets,
  ],
  streaming: "allow",
});
