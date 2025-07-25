import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(
      "https://api.onroster.app/storage/v1/object/public/vcard/roster.vcf",
      { next: { revalidate: 0 } }
    );

    if (!response.ok) {
      return new NextResponse("Failed to fetch vCard", { status: 500 });
    }

    const vcardContent = await response.text();

    return new NextResponse(vcardContent, {
      status: 200,
      headers: {
        "Content-Type": "text/x-vcard",
        "Cache-Control": "no-cache",
        "Content-Disposition": 'inline; filename="roster-vcard.vcf"',
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
      },
    });
  } catch (error) {
    return new NextResponse("Error fetching vCard", { status: 500 });
  }
}
