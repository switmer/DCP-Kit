import { NextResponse } from "next/server";
import TwilioClient from "@/lib/twilio";

export const maxDuration = 300;

export async function POST(request: Request) {
  const body = await request.json();

  const req: Record<string, any> = {
    body: body.body?.replace(/[ \t]+/g, " ")?.trim(),
    from: process.env.TWILIO_NUMBER,
    to: body.to,
  };

  if (body.deliveryStatusCallback) {
    req.statusCallback = body.deliveryStatusCallback;
  }

  const message = await TwilioClient.messages.create(req);

  return NextResponse.json({ message });
}
