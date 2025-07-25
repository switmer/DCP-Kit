import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import TwilioClient from "@/lib/twilio";
import {
  getAdjustedCallTime,
  getFormattedTime,
  normalizeCallSheetMember,
} from "@/lib/utils";
import { Resend } from "resend";
import { CallCard } from "@/components/emails/CallCard";
import { sendSlackAlert } from "@/lib/slack";
import { format, parse } from "date-fns";
import { Database } from "@/types/supabase";
import { NotificationLogType } from "@/types/type";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient<Database>({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ sent: false });
  }

  const { data } = await supabase
    .from("call_sheet_member")
    .select(`*, project_position(*, project_member(*))`)
    .eq("id", context.params.id)
    .single();

  const member = normalizeCallSheetMember(data);

  if (!member) {
    return NextResponse.json({ sent: false });
  }

  const { data: callSheetData } = await supabase
    .from("call_sheet")
    .select()
    .eq("id", member.call_sheet as string)
    .single();

  if (!callSheetData) {
    return NextResponse.json({ sent: false });
  }

  const { data: callPush } = await supabase
    .from("call_sheet_push_call")
    .select("*")
    .eq("call_sheet", member.call_sheet as string)
    .order("created_at", { ascending: false })
    .single();

  const generalCall = (callSheetData?.raw_json as any)?.general_crew_call;

  const formattedTime = getFormattedTime(
    member.call_time as string,
    generalCall
  );
  const adjustedCallTime = getAdjustedCallTime(formattedTime, {
    hours: callPush?.hours ?? 0,
    minutes: callPush?.minutes ?? 0,
  });

  let formattedDate = (callSheetData?.raw_json as any)?.full_date;
  try {
    formattedDate = format(
      parse(
        (callSheetData?.raw_json as any)?.full_date,
        "MM/dd/yy",
        new Date()
      ),
      "EEE, MMM d"
    );
  } catch (error) {
    /* TODO: setup logs */
  }

  if (member.phone) {
    const { data: previousMessages } = await supabase
      .from("notification_log")
      .select(
        `
        call_sheet_member!inner (
          phone
        )
      `
      )
      .eq("call_sheet_member.phone", member.phone)
      .eq("type", "call_card_sent");

    const isFirstMessage = !previousMessages || !previousMessages.length;

    const messageOptions: any = {
      body: `
      Hey ${member.name}, your call time for ${
        (callSheetData?.raw_json as any)?.job_name
      } is ${adjustedCallTime} on ${formattedDate}.
      \nView details and confirm: 
      ${process.env.NEXT_PUBLIC_SITE_URL}/c/${member.short_id}\n
    `
        ?.replace(/[ \t]+/g, " ")
        ?.trim(),
      from: process.env.TWILIO_NUMBER,
      to: member.phone,
      statusCallback: `${process.env.NEXT_PUBLIC_SITE_URL}/sms/call-card/delivery-status?id=${member.id}`,
    };

    if (isFirstMessage) {
      messageOptions.mediaUrl = [
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/vcard`,
      ];
    }

    await TwilioClient.messages.create(messageOptions);
  }

  if (member.email) {
    await resend.emails.send({
      from: "Roster <noreply@onroster.app>",
      to: [member.email],
      subject: `Your call time for ${
        (callSheetData?.raw_json as any)?.job_name
      }`,
      react: CallCard({
        memberName: member.name as string,
        jobName: (callSheetData?.raw_json as any)?.job_name,
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
    });
  }

  if (!member.phone && !member.email) {
    return NextResponse.json({ sent: false });
  }

  await supabase
    .from("call_sheet_member")
    .update({
      status: "sent-call-card",
      sent_at: new Date().toISOString(),
    })
    .eq("id", member.id);

  try {
    await sendSlackAlert(
      `Org \`${member.company}\` sent a single call card from callsheet \`${member.call_sheet}\` <https://onroster.app/sheet/${callSheetData.short_id}|View call sheet>`
    );

    const notificationLogs = [
      {
        type: "call_card_sent",
        call_sheet: member.call_sheet,
        call_sheet_member: member.id,
        company: member.company,
      },
    ];

    if (member.email) {
      notificationLogs.push({
        type: "call_card_email_sent",
        call_sheet: member.call_sheet,
        call_sheet_member: member.id,
        company: member.company,
      });
    }

    await supabase
      .from("notification_log")
      .insert(notificationLogs as NotificationLogType[]);
  } catch {}

  return NextResponse.json({ sent: true });
}
