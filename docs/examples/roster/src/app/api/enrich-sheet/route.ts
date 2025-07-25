import { inngest } from "@/inngest/inngest.client";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();

  await inngest.send({
    name: "callsheet/enrich",
    data: body,
  });

  return NextResponse.json({ data: body });
}
