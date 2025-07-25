import { NonRetriableError } from "inngest";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import { inngest } from "../inngest.client";
import xior from "xior";

const axios = xior.create();

enum MessageBodyResponse {
  Positive = "positive",
  Negative = "negative",
  Unknown = "unknown",
}

export const crewingContactAttemptResponse = inngest.createFunction(
  {
    id: "crewing-contact-attempt-response",
    retries: 0,
    throttle: {
      limit: 1,
      period: "5s",
    },
  },
  { event: "crewing/contact-attempt-response" },
  async ({ event, step }) => {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

    const messageBodyResponse = await step.run(
      "Parse message response setiment",
      async () => {
        const positiveResponses = ["yes", "y", "ok", "okay", "sure"];
        const negativeResponses = ["no", "n", "not interested"];

        const messageBody = event.data.Body?.trim()?.toLowerCase();

        if (positiveResponses.includes(messageBody)) {
          return MessageBodyResponse.Positive;
        } else if (negativeResponses.includes(messageBody)) {
          return MessageBodyResponse.Negative;
        } else {
          return MessageBodyResponse.Unknown;
        }
      }
    );

    if (messageBodyResponse === MessageBodyResponse.Unknown) {
      return {
        success: false,
        message: "Unknown response",
      };
    }

    const latestMessage = await step.run(
      "Get the latest message that crew responds to",
      async () => {
        const { data } = await supabase
          .from("crewing_contact_attempt_message")
          .select("*")
          .order("created_at", { ascending: false })
          .eq("to", event.data.From)
          .limit(1)
          .single();

        return data;
      }
    );

    if (!latestMessage || !latestMessage.attempt) {
      return {
        success: false,
        message: "No latest message found",
      };
    }

    const { data: updatedAttempt, error } = await step.run(
      messageBodyResponse === MessageBodyResponse.Positive
        ? "Confirmed availability"
        : "Declined availability",
      async () => {
        return await supabase
          .from("crewing_contact_attempt")
          .update({
            status:
              messageBodyResponse === MessageBodyResponse.Negative
                ? "declined"
                : "confirmed",
          })
          .eq("id", latestMessage.attempt as number)
          .select(
            `
            *,
            crewing_position (
              *,
              project (
                  company (
                    name,
                    phone_number
                  )
              )
            )
          `
          )
          .order("id", { ascending: true })
          .limit(1)
          .single();
      }
    );
    if (!updatedAttempt)
      return {
        success: false,
        message: "No contact attempt found to update",
        error,
      };

    await step.run("Respond to the message", async () => {
      await axios.post(`${process.env.NEXT_PUBLIC_SITE_URL}/sms/avail`, {
        to: updatedAttempt.crewing_position?.project?.company?.phone_number /* TODO: Get from crew */,
        body: `${
          messageBodyResponse === MessageBodyResponse.Positive
            ? `Great, we've confirmed your availability\n\n- ${updatedAttempt.crewing_position?.project?.company?.name}`
            : `No worries, hope to work with you soon.\n\n- ${updatedAttempt.crewing_position?.project?.company?.name}`
        }`,
      });
    });

    await step.run("Process contact attempt queue", async () => {
      return await inngest.send({
        name: "crewing/contact-attempt-queue",
        data: {
          position: updatedAttempt?.position,
        },
      });
    });

    return {
      success: true,
    };
  }
);
