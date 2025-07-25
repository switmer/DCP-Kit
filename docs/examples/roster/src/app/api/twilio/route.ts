import { inngest } from "@/inngest/inngest.client";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const body = Object.fromEntries(formData);

  await inngest.send({
    name: "crewing/contact-attempt-response",
    data: body,
  });

  return NextResponse.json({ data: body });
}
