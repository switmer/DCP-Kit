import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import TwilioClient from "@/lib/twilio";
import { normalizeCallSheetMember } from "@/lib/utils";

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient({ cookies });

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

  const { data: callSheetData } = await supabase
    .from("call_sheet")
    .select()
    .eq("id", member?.call_sheet as string)
    .single();

  if (!member || !callSheetData) {
    // skip
    return NextResponse.json({ sent: false });
  }

  if (!!member?.phone) {
    await TwilioClient.messages
      .create({
        body: `
      Thanks, ${member.name}! You're confirmed for ${callSheetData?.raw_json?.job_name} on ${callSheetData.raw_json.full_date}.
    `,
        from: process.env.TWILIO_NUMBER,
        to: member.phone,
      })
      .catch(() => {
        return NextResponse.json({ sent: false });
      });
  }

  try {
    await supabase.from("notification_log").insert({
      type: "call_card_confirmed",
      call_sheet: member.call_sheet,
      call_sheet_member: member.id,
      company: member.company,
    });
  } catch {}

  return NextResponse.json({ sent: true });
}
