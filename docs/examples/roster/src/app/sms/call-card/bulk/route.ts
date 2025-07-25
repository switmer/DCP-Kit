import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import TwilioClient from "@/lib/twilio";
import { Database, TablesInsert } from "@/types/supabase";
import { CallSheetMemberType, CallSheetType } from "@/types/type";
import {
  getAdjustedCallTime,
  getFormattedTime,
  normalizeCallSheetMember,
} from "@/lib/utils";
import { CallCard } from "@/components/emails/CallCard";
import { Resend } from "resend";
import { sendSlackAlert } from "@/lib/slack";
import { format, parse } from "date-fns";
import * as Sentry from "@sentry/nextjs";

export const maxDuration = 300;

const resend = new Resend(process.env.RESEND_API_KEY);

const BATCH_SIZE = 100;
const SMS_BATCH_SIZE = 50;
const BATCH_DELAY_MS = 1000;

const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: Request) {
  const body = await request.json();

  const supabase = createRouteHandlerClient<Database>({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ sent: false });
  }

  const { data: callSheetMembers } = await supabase
    .from("call_sheet_member")
    .select(`*, project_position(*, project_member(*))`)
    .in("id", body.ids);

  const data = callSheetMembers?.map((member) =>
    normalizeCallSheetMember(member)
  );

  if (!data) {
    return NextResponse.json({ sent: false });
  }

  const { data: callSheetData } = await supabase
    .from("call_sheet")
    .select()
    .eq("id", data[0]?.call_sheet as string)
    .single();

  const { data: callPush } = await supabase
    .from("call_sheet_push_call")
    .select("*")
    .eq("call_sheet", callSheetData?.id as string)
    .order("created_at", { ascending: false })
    .single();

  /* @ts-ignore */
  const generalCall = callSheetData?.raw_json?.general_crew_call;

  if (!callSheetData) {
    return NextResponse.json({ sent: false });
  }

  /* @ts-ignore */
  let formattedDate = callSheetData?.raw_json?.full_date;
  try {
    formattedDate = format(
      /* @ts-ignore */
      parse(callSheetData?.raw_json?.full_date, "MM/dd/yy", new Date()),
      "EEE, MMM d"
    );
  } catch (error) {
    /* TODO: setup logs */
  }

  const smsMembers = data?.filter(
    (member: CallSheetMemberType) =>
      !!member.phone && member.status === "pending"
  );

  const smsBatches = chunkArray(smsMembers, SMS_BATCH_SIZE);

  const smsPromises = smsBatches.map(async (batch, batchIndex) => {
    if (batchIndex > 0) {
      await sleep(BATCH_DELAY_MS);
    }

    return Promise.all(
      batch.map(async (member) => {
        const formattedTime = getFormattedTime(
          member.call_time ?? "",
          generalCall ?? ""
        );
        const adjustedCallTime = getAdjustedCallTime(formattedTime, {
          hours: callPush?.hours ?? 0,
          minutes: callPush?.minutes ?? 0,
        });

        try {
          const message = await TwilioClient.messages.create({
            to: member.phone,
            from: process.env.TWILIO_NUMBER,
            body: `Hey ${member.name}, your call time for ${
              /* @ts-ignore */
              callSheetData?.raw_json?.job_name
            } is ${adjustedCallTime} on ${formattedDate}.\n\nView details and confirm: ${
              process.env.NEXT_PUBLIC_SITE_URL
            }/c/${member.short_id}\n`,
            statusCallback: `${process.env.NEXT_PUBLIC_SITE_URL}/sms/call-card/delivery-status?id=${member.id}`,
          });

          await supabase
            .from("call_sheet_member")
            .update({
              status: "sent-call-card",
              sent_at: new Date().toISOString(),
            })
            .eq("id", member.id);

          return message;
        } catch (error) {
          Sentry.captureException(error);
        }
      })
    );
  });

  const emailMembers = data.filter(
    (member: CallSheetMemberType) => member.email && member.status === "pending"
  );

  const emailBatches = chunkArray(emailMembers, BATCH_SIZE);

  const emailPromises = emailBatches.map(async (batch) => {
    const emails = batch.map((member) => {
      const formattedTime = getFormattedTime(
        member?.call_time ?? "",
        generalCall ?? ""
      );
      const adjustedCallTime = getAdjustedCallTime(formattedTime, {
        hours: callPush?.hours ?? 0,
        minutes: callPush?.minutes ?? 0,
      });

      return {
        from: "Roster <noreply@onroster.app>",
        to: [member.email as string],
        /* @ts-ignore */
        subject: `Your call time for ${callSheetData?.raw_json?.job_name}`,
        react: CallCard({
          /* @ts-ignore */
          memberName: member.name,
          /* @ts-ignore */
          jobName: callSheetData?.raw_json?.job_name,
          callTime: adjustedCallTime,
          fullDate: formattedDate,
          confirmationUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/c/${member.short_id}`,
        }),
        tags: [
          {
            name: "member",
            value: member.id,
          },
          {
            name: "type",
            value: "call_card_email",
          },
          {
            name: "company",
            value: member.company as string,
          },
          {
            name: "call_sheet",
            value: member.call_sheet as string,
          },
        ],
      };
    });

    try {
      await resend.batch.send(emails);

      await supabase
        .from("call_sheet_member")
        .update({
          status: "sent-call-card",
          sent_at: new Date().toISOString(),
        })
        .in(
          "id",
          batch.map((member) => member.id)
        );
    } catch (error) {
      Sentry.captureException(error);
    }
  });

  await Promise.all([...smsPromises, ...emailPromises]);

  const logEntries: TablesInsert<"notification_log">[] = data
    .filter((member) => !!member && (member?.phone || member?.email))
    .flatMap((member) => {
      const entries: TablesInsert<"notification_log">[] = [];

      if (member?.phone) {
        entries.push({
          type: "call_card_sent",
          call_sheet: member.call_sheet,
          call_sheet_member: member?.id as string,
          company: member?.company as string,
        });
      }

      if (member?.email) {
        entries.push({
          type: "call_card_email_sent",
          call_sheet: member.call_sheet,
          call_sheet_member: member?.id as string,
          company: member?.company as string,
        });
      }

      return entries;
    });

  if (logEntries.length > 0) {
    await supabase.from("notification_log").insert(logEntries);
  }

  try {
    await sendSlackAlert(
      `Org \`${callSheetData.company}\` sent ${data.length} call card${
        data.length !== 1 ? "s" : ""
      } from callsheet \`${callSheetData.id}\` <https://onroster.app/sheet/${
        callSheetData.short_id
      }|View call sheet>`
    );
  } catch (e) {
    console.error(e);
  }

  return NextResponse.json({ sent: true });
}
