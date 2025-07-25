import { NextResponse } from "next/server";
import _ from "lodash";
import { inngest } from "@/inngest/inngest.client";

export const maxDuration = 300;

export async function POST(request: Request) {
  const body = await request.json();

  await inngest.send({
    name: "callsheet/process",
    data: {
      id: body.id,
      result: body.result,
    },
  });

  return NextResponse.json({ data: "processing triggered" });
}
