import { NonRetriableError } from "inngest";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import { format, parse } from "date-fns";
import { inngest } from "../inngest.client";
import xior from "xior";

const axios = xior.create();

function formatDateRange(dates: string[]) {
  if (dates.length === 0) {
    return "";
  }

  const parsedDates = dates
    .map((date) => parse(date, "MM/dd/yy", new Date()))
    .sort((a, b) => a.getTime() - b.getTime());

  const startDate = parsedDates[0];
  const endDate = parsedDates[parsedDates.length - 1];

  if (parsedDates.length === 1) {
    return format(startDate, "MMM d");
  }

  const formattedStartDate = format(startDate, "MMM d");
  const formattedEndDate = format(endDate, "MMM d");

  if (startDate.getTime() === endDate.getTime()) {
    return formattedStartDate;
  }

  if (startDate.getMonth() === endDate.getMonth()) {
    return `${formattedStartDate} - ${format(endDate, "d")}`;
  }

  return `${formattedStartDate} - ${formattedEndDate}`;
}

export const crewingContactAttempt = inngest.createFunction(
  {
    id: "crewing-contact-attempt",
    retries: 0,
    throttle: {
      limit: 1,
      period: "5s",
    },
  },
  { event: "crewing/contact-attempt" },
  async ({ event, step }) => {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

    const { data, error } = await step.run(
      "Create contact attempt",
      async () => {
        return await supabase
          .from("crewing_contact_attempt")
          .insert({
            crew: event.data.crew,
            crew_member_id: event.data.crew_member_id,
            position: event.data.position,
            status: "pending",
            response_deadline: event.data.response_deadline,
          })
          .select()
          .single();
      }
    );

    if (error) {
      throw new NonRetriableError(error.message);
    }

    await step.run("Send contact attempt SMS/EMAIL", async () => {
      const [{ data: crewing_position_crew }, { data: position }] =
        await Promise.all([
          supabase
            .from("crewing_position_crew")
            .select(
              `
              *,
              crew (
                first_name,
                company (
                  *
                )
              )
            `
            )
            .eq("id", event.data.crew)
            .limit(1)
            .single(),
          supabase
            .from("crewing_position")
            .select(
              `
            *,
            project (
              dates
            )
          `
            )
            .eq("id", event.data.position)
            .limit(1)
            .single(),
        ]);

      const {
        data: { message },
      } = await axios.post(`${process.env.NEXT_PUBLIC_SITE_URL}/sms/avail`, {
        /* @ts-ignore */
        to: crewing_position_crew?.crew?.company
          ?.phone_number /* TODO: Get from crew */,
        body: `Hey ${
          /* @ts-ignore */
          crewing_position_crew?.crew?.first_name
        }, we want to hire you for a shoot ${formatDateRange(
          position?.project?.dates ?? []
        )} as a ${position?.position}.

Confirm availability & see more details @ ${process.env.NEXT_PUBLIC_SITE_URL}/avail/${
          data.short_id
        }

Not available? Reply NO

- ${
          /* @ts-ignore */
          crewing_position_crew?.crew?.company?.name
        }

(Sent using Roster)`,
      });

      await Promise.all([
        supabase
          .from("crewing_contact_attempt")
          .update({ status: "contacted" })
          .eq("id", data.id)
          .single(),
        supabase.from("crewing_contact_attempt_message").insert({
          type: "sms",
          attempt: data.id,
          source: "twilio",
          external_id: message.sid,
          to: message.to,
        }),
      ]);
    });

    /* Wait for response deadline before continuing */
    await step.sleepUntil(
      {
        id: "wait-for-response-deadline",
        name: "Wait for response deadline",
      },
      event.data.response_deadline
    );

    const { data: attempt } = await step.run(
      "Check for contact attempt response after deadline",
      async () =>
        await supabase
          .from("crewing_contact_attempt")
          .select()
          .eq("id", data.id)
          .single()
    );

    if (attempt?.status !== "contacted") {
      return;
    }

    await step.run("Expire contact attempt", async () => {
      return await supabase
        .from("crewing_contact_attempt")
        .update({ status: "no_response" })
        .eq("id", data.id)
        .select()
        .order("id", { ascending: true })
        .limit(1)
        .single();
    });

    await step.run("Process contact attempt queue", async () => {
      return await inngest.send({
        name: "crewing/contact-attempt-queue",
        data: {
          position: event.data.position,
        },
      });
    });
  }
);
