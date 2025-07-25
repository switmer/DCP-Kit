import { NextResponse } from "next/server";
import { xior } from "xior";
import { degrees, PDFDocument } from "pdf-lib";
import { createClient } from "@supabase/supabase-js";
import { ImageResponse } from "@vercel/og";

export const maxDuration = 300;

const axios = xior.create();

async function loadGoogleFont() {
  const url = `https://fonts.googleapis.com/css2?family=DM+Sans:wght@700`;

  const css = await (await fetch(url)).text();

  const resource = css.match(
    /src: url\((.+)\) format\('(opentype|truetype)'\)/
  );

  if (resource) {
    const res = await fetch(resource[1]);
    if (res.status == 200) {
      return await res.arrayBuffer();
    }
  }

  throw new Error("failed to load font data");
}

export async function POST(request: Request) {
  const body = await request.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!
  );

  const { data: src } = await supabase.storage
    .from("call-sheets")
    .createSignedUrl(body.src ?? "", 60 * 60 * 24);

  if (!src || !src.signedUrl) {
    return NextResponse.json(
      { error: "Failed to get signed URL for the callsheet." },
      { status: 500 }
    );
  }

  const { response } = await axios.get(src.signedUrl, {
    responseType: "arraybuffer",
  });

  const { data: callPush } = await supabase
    .from("call_sheet_push_call")
    .select("*")
    .eq("call_sheet", body.id)
    .order("created_at", { ascending: false })
    .single();

  const pdfBuffer = Buffer.from(await response.arrayBuffer());

  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();

  const fontData = await loadGoogleFont();

  const imageResponse = new ImageResponse(
    (
      <div
        style={{
          width: "300px",
          height: "100px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "5px solid #EB0202",
          borderRadius: "10px",
          backgroundColor: "transparent",
        }}
      >
        <div
          style={{
            color: "#EB0202",
            fontFamily: "DM Sans",
            fontSize: "28px",
            fontWeight: 700,
            textAlign: "center",
            textTransform: "uppercase",
            lineHeight: 1.2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <span>Call Pushed</span>
          <span>
            {[
              callPush.hours &&
                `${callPush.hours} HOUR${callPush.hours > 1 ? "S" : ""}`,
              callPush.minutes &&
                `${callPush.minutes} MINUTE${callPush.minutes > 1 ? "S" : ""}`,
            ]
              .filter(Boolean)
              .join(" ")}
          </span>
        </div>
      </div>
    ),
    {
      width: 300,
      height: 100,
      fonts: [
        {
          name: "DM Sans",
          data: fontData,
          style: "normal",
        },
      ],
    }
  );

  const pngBuffer = await imageResponse.arrayBuffer();

  if (!pngBuffer) {
    throw new Error("Failed to generate PNG");
  }

  // Embed PNG in PDF
  const pngImage = await pdfDoc.embedPng(pngBuffer);

  for (const page of pages) {
    const { width, height } = page.getSize();
    const pngDims = pngImage.scale(0.5); // Adjust scale as needed

    page.drawImage(pngImage, {
      x: width / 2 - pngDims.width / 2,
      y: height - 100, // Adjusted y-position
      width: pngDims.width,
      height: pngDims.height,
      rotate: degrees(8),
    });
  }

  const modifiedPdfBytes = await pdfDoc.save();

  const lastSlashIndex = body.src.lastIndexOf("/");
  const folderPath = body.src.substring(0, lastSlashIndex + 1);
  const originalFilename = body.src.substring(lastSlashIndex + 1);

  const newFilename = `pushed_${originalFilename}`;
  const newFilePath = `${folderPath}${newFilename}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("call-sheets")
    .upload(newFilePath, modifiedPdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "Failed to upload modified PDF" },
      { status: 500 }
    );
  }
  const { error: updateError } = await supabase
    .from("call_sheet_push_call")
    .update({ src: uploadData.path })
    .eq("id", callPush.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update call_sheet_push_call" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}