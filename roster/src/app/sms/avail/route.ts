import { NextResponse } from "next/server";
import TwilioClient from "@/lib/twilio";

export const maxDuration = 300;

export async function POST(request: Request) {
  const body = await request.json();

  const message = await TwilioClient.messages.create({
    body: body.body?.replace(/[ \t]+/g, " ")?.trim(),
    from: process.env.TWILIO_NUMBER,
    to: body.to,
  });

  return NextResponse.json({ message });
}
