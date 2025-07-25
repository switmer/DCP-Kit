import { inngest } from "@/inngest/inngest.client";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const maxDuration = 300;

export async function POST(request: Request) {
  const body = await request.json();

  const supabase = createRouteHandlerClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  await inngest.send({
    name: "callsheet/parse",
    data: {
      path: body.path,
      bulkJobId: body.bulkJobId,
      historical: true,
      company: body.company,
    },
    user,
  });

  return NextResponse.json({ success: true });
}
