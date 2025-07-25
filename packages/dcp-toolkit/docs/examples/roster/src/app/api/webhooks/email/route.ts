import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!
  );
  const body = await request.json();

  if (
    !body?.data?.tags?.member ||
    !["message_email", "call_card_email"].includes(body?.data?.tags?.type)
  ) {
    return NextResponse.json({ message: "Member not found" });
  }

  const { data: member } = await supabase
    .from("call_sheet_member")
    .select()
    .eq("id", body?.data?.tags?.member)
    .single();

  if (!member) {
    return NextResponse.json({ message: "Member not found" });
  }

  switch (body?.type) {
    case "email.delivered":
      await supabase.from("notification_log").insert({
        type: `${body?.data?.tags?.type}_delivered`,
        call_sheet: member.call_sheet,
        call_sheet_member: member.id,
        company: member.company,
        content: body,
      });
      break;
    case "email.bounced":
      await supabase.from("notification_log").insert({
        type: `${body?.data?.tags?.type}_failed`,
        call_sheet: member.call_sheet,
        call_sheet_member: member.id,
        company: member.company,
        content: body,
      });
      break;
    case "email.opened":
      await supabase.from("notification_log").insert({
        type: `${body?.data?.tags?.type}_opened`,
        call_sheet: member.call_sheet,
        call_sheet_member: member.id,
        company: member.company,
        content: body,
      });
      break;
  }

  return NextResponse.json({ body });
}
