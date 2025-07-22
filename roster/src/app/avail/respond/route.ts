import { inngest } from "@/inngest/inngest.client";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const maxDuration = 300;

export async function POST(request: Request) {
  const body = await request.json();

  const supabase = createClient();

  const { data } = await supabase
    .from("crewing_contact_attempt")
    .update({
      status: body.status,
    })
    .eq("id", body.id)
    .select()
    .order("id", { ascending: true })
    .limit(1)
    .single();

  await inngest.send({
    name: "crewing/contact-attempt-queue",
    data: {
      position: data?.position,
    },
  });

  return NextResponse.json({
    success: true,
  });
}
