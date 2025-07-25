import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import TwilioClient from "@/lib/twilio";
import { Database } from "@/types/supabase";
import { CallSheetMemberType, NotificationLogType } from "@/types/type";
import { Resend } from "resend";
import Message from "@/components/emails/Message";
import { normalizeCallSheetMember } from "@/lib/utils";
import * as Sentry from "@sentry/nextjs";

type Member = CallSheetMemberType;

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

  const { data: members } = await supabase
    .from("call_sheet_member")
    .select(`*, project_position(*, project_member(*))`)
    .in("id", body.ids);

  const data = members?.map((member) => normalizeCallSheetMember(member));

  if (!data) {
    return NextResponse.json({ sent: false });
  }

  const { data: callSheetData } = await supabase
    .from("call_sheet")
    .select()
    .eq("id", data[0]?.call_sheet as string)
    .single();

  if (!callSheetData) {
    return NextResponse.json({ sent: false });
  }

  const smsMembers = data?.filter((member: Member) => !!member.phone) ?? [];
  const smsBatches = chunkArray(smsMembers, SMS_BATCH_SIZE);

  const smsPromises = smsBatches.map(async (batch, batchIndex) => {
    if (batchIndex > 0) {
      await sleep(BATCH_DELAY_MS);
    }

    return Promise.all(
      batch.map(async (member) => {
        const { data: previousMessages } = await supabase
          .from("notification_log")
          .select(
            `
            call_sheet_member!inner (
              phone
            )
          `
          )
          .eq("call_sheet_member.phone", member?.phone as string)
          .eq("type", "call_card_sent");

        const isFirstMessage = !previousMessages || !previousMessages.length;

        const messageOptions: any = {
          body: `${body.message}\n\nView details: ${process.env.NEXT_PUBLIC_SITE_URL}/c/${member?.short_id}`
            .replace(/[ \t]+/g, " ")
            ?.trim(),
          from: process.env.TWILIO_NUMBER,
          to: (member as unknown as Member)?.phone,
          statusCallback: `${process.env.NEXT_PUBLIC_SITE_URL}/sms/custom/delivery-status?id=${member?.id}`,
        };

        if (isFirstMessage) {
          messageOptions.mediaUrl = [
            `${process.env.NEXT_PUBLIC_SITE_URL}/api/vcard`,
          ];
        }

        try {
          return await TwilioClient.messages.create(messageOptions);
        } catch (error) {
          Sentry.captureException(error);
        }
      })
    );
  });

  const emailMembers = data?.filter((member: Member) => !!member.email);

  const emailBatches = chunkArray(emailMembers, BATCH_SIZE);

  const emailPromises = emailBatches.map(async (batch) => {
    const emails = batch.map((member) => {
      return {
        from: "Roster <noreply@onroster.app>",
        to: [member?.email as string],
        subject: `New message from ${
          (callSheetData?.raw_json as any)?.job_name ?? "Roster"
        }`,
        react: Message({
          body: body.message,
          jobName: (callSheetData?.raw_json as any)?.job_name ?? "Roster",
          url: `${process.env.NEXT_PUBLIC_SITE_URL}/c/${member?.short_id}`,
        }),
        tags: [
          {
            name: "member",
            value: member?.id as string,
          },
          {
            name: "type",
            value: "message_email",
          },
          {
            name: "company",
            value: member?.company as string,
          },
          {
            name: "call_sheet",
            value: member?.call_sheet as string,
          },
        ],
      };
    });

    try {
      await resend.batch.send(emails);
    } catch (error) {
      Sentry.captureException(error);
    }
  });

  await Promise.all([...smsPromises, ...emailPromises]);

  const logData: NotificationLogType[] = data
    ?.map((member) => {
      const logs: NotificationLogType[] = [];

      if (member?.phone) {
        logs.push({
          type: "message",
          content: body.message,
          call_sheet: member?.call_sheet as string,
          call_sheet_member: member?.id as string,
          company: member?.company as string,
        } as NotificationLogType);
      }

      if (member?.email) {
        logs.push({
          type: "message_email",
          content: body.message,
          call_sheet: member?.call_sheet as string,
          call_sheet_member: member?.id as string,
          company: member?.company as string,
        } as NotificationLogType);
      }

      return logs;
    })
    .flat();

  try {
    if (logData?.length) {
      await supabase.from("notification_log").insert(logData);
    }
  } catch (e) {
    console.error(e);
  }

  return NextResponse.json({ sent: true });
}
