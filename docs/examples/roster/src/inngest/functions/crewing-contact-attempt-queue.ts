import { NonRetriableError } from "inngest";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import { addHours, format } from "date-fns";
import { inngest } from "../inngest.client";
import xior from "xior";

const axios = xior.create();

export const crewingContactAttemptQueue = inngest.createFunction(
  {
    id: "crewing-contact-attempt-queue",
    retries: 0,
    throttle: {
      limit: 1,
      period: "5s",
    },
  },
  { event: "crewing/contact-attempt-queue" },
  async ({ event, step }) => {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

    const { data: position } = await step.run(
      "Get crewing position",
      async () => {
        return await supabase
          .from("crewing_position")
          .select()
          .eq("id", event.data.position)
          .single();
      }
    );

    if (position?.hiring_status === "closed") {
      return;
    }

    const { data: confirmedCrew } = await step.run(
      "Get confirmed crew",
      async () => {
        return await supabase
          .from("crewing_contact_attempt")
          .select()
          .eq("position", event.data.position)
          .eq("status", "confirmed");
      }
    );

    if ((position?.quantity ?? 0) <= (confirmedCrew?.length ?? 0)) {
      await supabase
        .from("crewing_position")
        .update({ hiring_status: "completed" })
        .eq("id", event.data.position);
      return;
    }

    const { data: crew } = await step.run("Get next crew in line", async () => {
      return await supabase
        .from("crewing_position_crew")
        .select(
          `
            *,
            crewing_contact_attempt (
                id
            )
          `
        )
        .eq("crewing_position", event.data.position)
        .order("priority", { ascending: true });
    });

    const nextCrew = crew?.find((crew) => !crew.crewing_contact_attempt.length);

    /* No more crew to contact */
    if (!nextCrew) {
      await supabase
        .from("crewing_position")
        .update({
          hiring_status: "closed",
        })
        .eq("id", event.data.position);
      return;
    }

    await step.run("Next crew contact attempt", async () => {
      return await inngest.send({
        name: "crewing/contact-attempt",
        data: {
          crew: nextCrew.id,
          position: nextCrew.crewing_position,
          priority: nextCrew.priority,
          response_deadline: format(
            addHours(new Date(), 4),
            "yyyy-MM-dd'T'HH:mm:ss"
          ),
        },
      });
    });
  }
);
