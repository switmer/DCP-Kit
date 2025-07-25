import { inngest } from "@/inngest/inngest.client";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { addHours, format } from "date-fns";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { crew, crew_member_id, position, priority } = await request.json();

  if (!crew || !crew_member_id || !position || priority === undefined) {
    return NextResponse.json(
      { error: "Missing crew, crew_member_id, position, or priority" },
      { status: 400 }
    );
  }

  const supabase = createRouteHandlerClient({ cookies });

  const response_deadline = format(
    addHours(new Date(), 4),
    "yyyy-MM-dd'T'HH:mm:ss"
  );

  await supabase
    .from("crewing_contact_attempt")
    .delete()
    .eq("position", position);

  await inngest.send({
    name: "crewing/contact-attempt",
    data: {
      crew,
      crew_member_id,
      position,
      priority,
      response_deadline,
    },
  });

  const { data } = await supabase
    .from("crewing_position")
    .update({
      hiring_status: "in_progress",
    })
    .eq("id", position)
    .select();

  return NextResponse.json({
    data: data?.[0],
  });
}
