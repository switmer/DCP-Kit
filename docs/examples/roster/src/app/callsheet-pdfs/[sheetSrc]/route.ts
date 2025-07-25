import { createClient } from "@/lib/supabase/server";
import { normalizeCallSheetMember } from "@/lib/utils";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { degrees, PDFDocument, rgb, StandardFonts } from "pdf-lib";

export const runtime = "nodejs";

async function getModifiedPdfKey(userId: string, originalFilename: string) {
  const cleanFilename = originalFilename.replace(new RegExp(`^${userId}/`), "");
  return `modified/${userId}/${cleanFilename}`;
}

async function modifyPDF(src: string, watermark: string) {
  const existingPdfBytes = await fetch(src).then((res) => res.arrayBuffer());
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const safeWatermark = watermark.toUpperCase();
  pdfDoc.setSubject(safeWatermark);

  const pages = pdfDoc.getPages();

  pages.forEach((page) => {
    const { width, height } = page.getSize();

    const diagonalLength = Math.sqrt(width * width + height * height);
    const fontSize = Math.min(
      diagonalLength * 0.12,
      (width * 0.8) / (safeWatermark.length / 2)
    );
    const watermarkWidth = helveticaFont.widthOfTextAtSize(
      safeWatermark,
      fontSize
    );

    const x = (width - watermarkWidth * Math.cos(Math.PI / 4)) / 2;
    const y = height / 2 + (watermarkWidth * Math.sin(Math.PI / 4)) / 2;

    page.drawText(safeWatermark, {
      x,
      y,
      size: fontSize,
      font: helveticaFont,
      color: rgb(0, 0, 0),
      opacity: 0.1,
      rotate: degrees(-45),
    });
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function GET(
  req: NextRequest,
  context: {
    params: {
      sheetSrc: string;
    };
  }
) {
  const reqUrl = new URL(req.url);
  const showOriginal = reqUrl.searchParams.get("original") === "true";
  const id = reqUrl.searchParams.get("id");

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!context.params.sheetSrc || context.params.sheetSrc === "" || !user) {
    return NextResponse.redirect(`${reqUrl.origin}/auth/sign-in`);
  }

  if (showOriginal) {
    const { data: originalPdfData } = await supabase.storage
      .from("call-sheets")
      .createSignedUrl(context.params.sheetSrc, 3600);

    if (!originalPdfData) {
      return NextResponse.redirect(`${reqUrl.origin}/auth/sign-in`);
    }

    return NextResponse.redirect(
      originalPdfData.signedUrl + "#navpanes=0&scrollbar=0&view=fitH"
    );
  }

  const modifiedPdfKey = await getModifiedPdfKey(
    user.id,
    context.params.sheetSrc
  );

  const { data: existingModifiedPdf } = await supabase.storage
    .from("call-sheets")
    .createSignedUrl(modifiedPdfKey, 3600);

  if (existingModifiedPdf) {
    return NextResponse.redirect(
      existingModifiedPdf.signedUrl + "#navpanes=0&scrollbar=0&view=fitH"
    );
  }

  const { data } = id
    ? await supabase
        .from("call_sheet_member")
        .select("*, project_position(*, project_member(*))")
        .eq("id", id)
        .single()
    : { data: null };

  const callSheetMember = normalizeCallSheetMember(data);

  const { data: callSheetSrcData } = await supabase.storage
    .from("call-sheets")
    .createSignedUrl(context.params.sheetSrc, 3600);

  if (!callSheetSrcData) {
    return NextResponse.redirect(`${reqUrl.origin}/auth/sign-in`);
  }

  const watermark = `${(
    callSheetMember?.name ||
    user?.email ||
    user?.phone ||
    ""
  )
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x00-\x7F]/g, "")
    .trim()}`;
  const modifiedPdf = await modifyPDF(callSheetSrcData.signedUrl, watermark);

  const { error: uploadError } = await supabase.storage
    .from("call-sheets")
    .upload(modifiedPdfKey, modifiedPdf, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    console.error("Error uploading modified PDF:", uploadError);
    return NextResponse.error();
  }

  const { data: modifiedPdfData } = await supabase.storage
    .from("call-sheets")
    .createSignedUrl(modifiedPdfKey, 3600);

  return NextResponse.redirect(
    modifiedPdfData?.signedUrl + "#navpanes=0&scrollbar=0&view=fitH"
  );
}
