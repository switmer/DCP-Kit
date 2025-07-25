import { inngest } from "@/inngest/inngest.client";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { addHours, format } from "date-fns";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { position } = await request.json();

  if (!position) {
    return NextResponse.json({ error: "Missing position" }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });

  await supabase
    .from("crewing_contact_attempt")
    .delete()
    .eq("position", position);

  const { data } = await supabase
    .from("crewing_position")
    .update({
      hiring_status: "open",
    })
    .eq("id", position)
    .select();

  return NextResponse.json({
    data: data?.[0],
  });
}
