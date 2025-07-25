import { createClient } from "@supabase/supabase-js";
import { inngest } from "../inngest.client";

export const expireParsingSheets = inngest.createFunction(
  {
    id: "expire-parsing-sheets",
    retries: 0,
    throttle: {
      limit: 1,
      period: "1m",
    },
  },
  { cron: "0 * * * *" },
  async ({ step }) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

    const expired = await step.run("Get parsing sheets", async () => {
      const { data } = await supabase
        .from("call_sheet")
        .select(`id, created_at`)
        .eq("status", "parsing");

      return (data ?? []).filter(
        (sheet) =>
          new Date(sheet.created_at).getTime() < Date.now() - 1000 * 60 * 15
      );
    });

    await step.run("Set expired sheets status to error", async () => {
      return await supabase
        .from("call_sheet")
        .update({ status: "error" })
        .in(
          "id",
          expired.map((sheet) => sheet.id)
        );
    });

    return { success: true };
  }
);
