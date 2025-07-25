import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { genDocByTemplate } from '@/lib/pdf-generation/genDocByTemplate';
import { mapCallSheetToPDFData } from '@/lib/pdf-generation/mapCallSheetToPDFData';

(<any>pdfMake).addVirtualFileSystem(pdfFonts);

export async function POST(request: Request) {
  const body = await request.json();

  const { options } = body.data;

  const supabase = createRouteHandlerClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }

  //-- NOTE -- STYLE PARAMETERS --------------------------
  const SECTION_HEADER_FILL = body?.customizationOptions ? body?.customizationOptions?.sectionHeaderFill : '#ccc';

  try {
    //-- map the incoming data to the format needed for pdfmake.
    const sheetData = mapCallSheetToPDFData(body.data.sheetData);

    const docDefinition: any = genDocByTemplate({
      sheetData,
      options: {
        template: options.template ?? 'advd',
        WATERMARKED: false,
        USE_TWO_COLUMNS: true,
        // style: CUSTOM_STYLE,
        // SECTION_HEADER_FILL: "#666",
      },
    });

    //-- generate the pdf.
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);

    //-- get the pdf buffer for streaming to client.
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      pdfDocGenerator.getBuffer((buffer: any) => {
        resolve(Buffer.from(buffer));
      });
    });

    //-- return pdf as download.
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="call-sheet.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating PDF:', error);

    return NextResponse.json({ error: 'Failed to generate PDF', details: error.message }, { status: 500 });
  }
}
