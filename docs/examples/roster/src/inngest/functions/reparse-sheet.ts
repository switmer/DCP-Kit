import { createClient } from "@supabase/supabase-js";
import { inngest } from "../inngest.client";
import { sendSlackAlert } from "@/lib/slack";
import { NonRetriableError } from "inngest";
import { parseCallSheetPart } from "./parse-sheet";
import xior from "xior";
import { llamaParser } from "@/lib/llamaparser";

const axios = xior.create();

export const reparseCallSheet = inngest.createFunction(
  {
    id: "reparse-call-sheet",
    retries: 0,
    throttle: {
      limit: 5,
      period: "30s",
    },
    onFailure: async ({ error, event }) => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE!
      );

      const originalEvent = event.data.event;

      await supabase.from("call_sheet").upsert({
        id: originalEvent.data.id,
        status: "error",
      });

      if (
        !process.env.SLACK_TOKEN ||
        !process.env.SLACK_ALERT_CHANNEL ||
        process.env.NODE_ENV !== "production"
      )
        return;

      const result = await sendSlackAlert(
        [
          "*⚠️ Call Sheet Reparse Failed*",
          "",
          `*ID:* \`${originalEvent.data.id}\``,
          "",
          "*Error:*",
          "```",
          error.toString(),
          "```",
        ].join("\n")
      );

      return result;
    },
  },
  { event: "callsheet/reparse" },
  async ({ event, step }) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

    const { data: callSheet, error: csError } = await step.run(
      "Get call sheet",
      async () => {
        return await supabase
          .from("call_sheet")
          .select("*")
          .eq("id", event.data.id)
          .single();
      }
    );

    if (csError || !callSheet) {
      throw new NonRetriableError(
        csError?.message ?? "Failed to get call sheet."
      );
    }

    await step.run("Update status to parsing", async () => {
      return await supabase
        .from("call_sheet")
        .update({ status: "parsing", raw_json: null })
        .eq("id", event.data.id);
    });

    await step.run("Clean up existing data", async () => {
      return await Promise.all([
        supabase.from("note").delete().eq("call_sheet", event.data.id),
        supabase
          .from("call_sheet_location")
          .delete()
          .eq("call_sheet", event.data.id),
        supabase
          .from("call_sheet_member")
          .delete()
          .eq("call_sheet", event.data.id),
      ]);
    });

    const md = await step.run("Download PDF and extract text", async () => {
      const { data: src, error } = await supabase.storage
        .from("call-sheets")
        .createSignedUrl(callSheet.src ?? "", 60 * 60 * 24);

      if (!src || !src.signedUrl) {
        throw new NonRetriableError(
          error?.message ?? "Failed to get signed URL for the callsheet."
        );
      }

      const { response } = await axios.get(src.signedUrl, {
        responseType: "stream",
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      const blob = new Blob([buffer], { type: "application/pdf" });

      const markdown = await llamaParser(blob, callSheet.src?.split("/")?.[1]);

      return markdown;
    });

    const result = await step.run("Process with gpt-4o", async () => {
      return parseCallSheetPart(md);
    });

    await step.run("Process parsed callsheet", async () => {
      return await inngest.send({
        name: "callsheet/process",
        data: {
          id: event.data.id,
          result,
        },
      });
    });

    return { success: true };
  }
);
