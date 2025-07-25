import { normalizeCallSheetMember } from "@/lib/utils";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!
  );

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  const formData = await request.formData();
  const body = Object.fromEntries(formData);

  if (body.SmsStatus === "sent") {
    return NextResponse.json({ body });
  }

  const { data } = await supabase
    .from("call_sheet_member")
    .select(`*, project_position(*, project_member(*))`)
    .eq("id", id)
    .single();

  const member = normalizeCallSheetMember(data);

  if (!member) {
    return NextResponse.json({ body });
  }

  switch (body.SmsStatus) {
    case "failed":
      await supabase.from("notification_log").insert({
        type: "message_failed",
        call_sheet: member.call_sheet,
        call_sheet_member: member.id,
        company: member.company,
        content: body,
      });

      break;
    case "delivered":
      await supabase.from("notification_log").insert({
        type: "message_delivered",
        call_sheet: member.call_sheet,
        call_sheet_member: member.id,
        company: member.company,
        content: body,
      });
      break;
  }

  return NextResponse.json({ body });
}
