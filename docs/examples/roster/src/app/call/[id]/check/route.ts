import { normalizeCallSheetMember } from "@/lib/utils";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  context: { params: { id: string } }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!
  );

  const { data } = await supabase
    .from("call_sheet_member")
    .select(
      `
      *,
      project_position(*, project_member(*))
    `
    )
    .eq("short_id", context.params.id)
    .single();

  const member = normalizeCallSheetMember(data);

  return NextResponse.json({
    email: member?.email,
    phone: member?.phone,
    id: member?.id,
    callSheet: member?.call_sheet,
    company: member?.company,
  });
}
