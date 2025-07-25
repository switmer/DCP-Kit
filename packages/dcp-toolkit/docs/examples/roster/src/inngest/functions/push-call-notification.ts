import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import { inngest } from "../inngest.client";
import xior from "xior";
import {
  getAdjustedCallTime,
  getFormattedTime,
  normalizeCallSheetMember,
} from "@/lib/utils";

const axios = xior.create();

export const pushCallNotification = inngest.createFunction(
  {
    id: "push-call-notification",
    retries: 0,
    throttle: {
      limit: 1,
      period: "5s",
    },
  },
  { event: "callsheet/push-call-notification" },
  async ({ event, step }) => {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

    const { id } = event.data;

    const { data } = await step.run("Retrieve the call sheet", async () => {
      return await supabase
        .from("call_sheet")
        .select("*")
        .eq("id", id)
        .single();
    });

    const { data: callPush } = await step.run(
      "Retrieve the call push",
      async () => {
        return await supabase
          .from("call_sheet_push_call")
          .select("*")
          .eq("call_sheet", id)
          .order("created_at", { ascending: false })
          .single();
      }
    );

    await step.run("Update call sheet pdf", async () => {
      return await axios.post(
        `${process.env.NEXT_PUBLIC_SITE_URL}/sheet/push/pdf`,
        {
          id: id,
          src: data?.src,
        }
      );
    });

    const { data: rawMembers } = await step.run(
      "Retrieve the members of the call sheet",
      async () => {
        return await supabase
          .from("call_sheet_member")
          .select("*,project_position(*, project_member(*))")
          .eq("call_sheet", id);
      }
    );

    const members = rawMembers
      ?.map((m) => normalizeCallSheetMember(m as any))
      .filter((m): m is NonNullable<typeof m> => m !== null);

    /* @ts-ignore */
    const generalCall = data?.raw_json?.general_crew_call;

    if (callPush?.notify) {
      await step.run("Send updated call card to all members", async () => {
        for (const member of members ?? []) {
          if (!member || !member.phone) continue;

          const formattedTime = getFormattedTime(
            member.call_time ?? "",
            generalCall ?? ""
          );
          const adjustedCallTime = getAdjustedCallTime(formattedTime, {
            hours: callPush?.hours ?? 0,
            minutes: callPush?.minutes ?? 0,
          });

          const pushedBy = `
          ${
            (callPush?.hours ?? 0) > 0
              ? `${callPush?.hours ?? 0} hour${
                  (callPush?.hours ?? 0) > 1 ? "s" : ""
                }`
              : ""
          }
          ${
            (callPush?.hours ?? 0) > 0
              ? (callPush?.minutes ?? 0) > 0
                ? " and "
                : ""
              : ""
          }${
            (callPush?.minutes ?? 0) > 0
              ? `${callPush?.minutes ?? 0} minute${
                  (callPush?.minutes ?? 0) > 1 ? "s" : ""
                }`
              : ""
          }
          `.trim();

          const smsBody =
            member.status !== "pending"
              ? `Hey ${member.name}, ALL CALLS PUSHED BY ${pushedBy}\n\n--\nClick here to confirm update:\n${process.env.NEXT_PUBLIC_SITE_URL}/call/${member.short_id}`
              : /* @ts-ignore */
                `Hey ${member.name}, your call time for ${data?.raw_json?.job_name} is ${adjustedCallTime} ${data.raw_json.full_date}.\nClick here to confirm: ${process.env.NEXT_PUBLIC_SITE_URL}/call/${member.short_id}`;

          try {
            await axios.post(`${process.env.NEXT_PUBLIC_SITE_URL}/sms/send`, {
              to: member.phone,
              body: smsBody,
              deliveryStatusCallback: `${process.env.NEXT_PUBLIC_SITE_URL}/sms/call-card/delivery-status?id=${member.id}`,
            });

            await supabase.from("notification_log").insert({
              type: "call_card_push_sent",
              call_sheet: member.call_sheet,
              call_sheet_member: member.id,
              company: member.company,
            });

            await supabase
              .from("call_sheet_member")
              .update({
                status: "sent-call-card",
                sent_at: new Date().toISOString(),
              })
              .eq("id", member.id);
          } catch {
            //
          }
        }
      });
    } else {
      await step.run("Reset member states", async () => {
        for (const member of members ?? []) {
          await supabase
            .from("call_sheet_member")
            .update({ status: "pending" })
            .eq("id", member.id);
        }
      });
    }
  }
);
