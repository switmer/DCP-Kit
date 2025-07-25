import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { makeName } from '@/lib/utils';
import Papa from 'papaparse';
import { CallSheetMemberType } from '@/types/type';
import { processRole } from '@/lib/processRole';

interface CSVRow {
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  department: string;
  position: string;
  note: string;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const companyId = cookies().get('activeCompany')?.value;

  if (!companyId) {
    return NextResponse.json({ error: 'No active company found' }, { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const overwriteMode = formData.get('overwriteMode') as string || 'skip';
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'text/csv') {
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 });
    }

    // Read CSV text
    const csvText = await file.text();

    // Parse with PapaParse (robust, handles quoted/multiline fields)
    const parseResult = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim().replace(/"/g, ''),
    });
    
    if (parseResult.errors.length > 0) {
      return NextResponse.json({
        error: 'Failed to parse CSV',
        details: parseResult.errors.map((e: Papa.ParseError) => e.message),
      }, { status: 400 });
    }

    const rowsRaw = parseResult.data as any[];

    const expectedHeaders = ['name', 'email', 'phone', 'city', 'state', 'department', 'position', 'note'];
    const headers = parseResult.meta.fields || [];
    
    // Validate headers
    const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      return NextResponse.json({ 
        error: `Missing required columns: ${missingHeaders.join(', ')}`,
        expectedHeaders,
        foundHeaders: headers,
      }, { status: 400 });
    }

    const extraColumns = headers.filter(h => !expectedHeaders.includes(h));

    const csvRows: CSVRow[] = [];
    const errors: string[] = [];

    rowsRaw.forEach((row, idx) => {
      // Ensure all expected headers exist on row
      expectedHeaders.forEach((h: string) => { if (!row[h]) row[h] = ''; });

      // Merge extra columns into note
      if (extraColumns.length > 0) {
        const extraNote = extraColumns
          .map((col: string) => row[col] ? `${col}: ${row[col]}` : '')
          .filter(Boolean)
          .join('\n');
        if (extraNote) {
          row.note = row.note ? `${row.note}\n${extraNote}` : extraNote;
        }
      }

        if (!row.name || (!row.email && !row.phone)) {
        errors.push(`Row ${idx + 2}: Name and either email or phone are required`); // +2 to account for header row
        return;
        }

        csvRows.push(row as CSVRow);
    });

    if (csvRows.length === 0) {
      return NextResponse.json({ 
        error: 'No valid rows found to import',
        errors 
      }, { status: 400 });
    }

    // Deduplicate rows within the CSV itself (by email or phone)
    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();
    const dedupedRows: CSVRow[] = [];
    csvRows.forEach(r => {
      const emailKey = r.email?.toLowerCase() || '';
      const phoneKey = r.phone || '';
      if (emailKey && seenEmails.has(emailKey)) return;
      if (!emailKey && phoneKey && seenPhones.has(phoneKey)) return;
      if (emailKey) seenEmails.add(emailKey);
      if (phoneKey) seenPhones.add(phoneKey);
      dedupedRows.push(r);
    });

    csvRows.length = 0;
    csvRows.push(...dedupedRows);

    // Check for existing crew members to avoid duplicates
    const emails = csvRows.filter(row => row.email).map(row => row.email.toLowerCase());
    const phones = csvRows.filter(row => row.phone).map(row => row.phone);

    let existingCrew: any[] = [];
    if (emails.length > 0 || phones.length > 0) {
      const { data } = await supabase
        .from('company_crew_member')
        .select('*')
        .eq('company', companyId)
        .or(`email.in.(${emails.join(',')}),phone.in.(${phones.join(',')})`);
      existingCrew = data || [];
    }

    const existingEmails = new Set(existingCrew.map(c => c.email?.toLowerCase()).filter(Boolean));
    const existingPhones = new Set(existingCrew.map(c => c.phone).filter(Boolean));

    let crewToInsert: CSVRow[] = [];
    let crewToUpdate: CSVRow[] = [];
    let skippedCount = 0;

    csvRows.forEach(row => {
      const emailExists = row.email && existingEmails.has(row.email.toLowerCase());
      const phoneExists = row.phone && existingPhones.has(row.phone);
      if (emailExists || phoneExists) {
        if (overwriteMode === 'overwrite') {
          crewToUpdate.push(row);
        } else {
          skippedCount++;
        }
      } else {
        crewToInsert.push(row);
      }
    });

    if (crewToInsert.length === 0 && overwriteMode === 'skip') {
      return NextResponse.json({ 
        error: 'No new crew members to import (all already exist)',
        skipped: skippedCount,
        errors 
      }, { status: 400 });
    }

    // Prepare crew data for insertion
    const crewData = crewToInsert.map(row => {
      const [first_name, last_name] = makeName(row.name);
      return {
        company: companyId,
        email: row.email || null,
        phone: row.phone || null,
        city: row.city || null,
        state: row.state || null,
        name: row.name,
        first_name,
        last_name,
        note: row.note || null,
      };
    });

    // Batch insert crew members (only if there are new ones)
    let insertedCrew: any[] = [];
    if (crewData.length > 0) {
      const insertResult = await supabase
        .from('company_crew_member')
        .insert(crewData)
        .select('*');
      if (insertResult.error) {
        return NextResponse.json({ 
          error: 'Failed to insert crew members',
          details: insertResult.error.message 
        }, { status: 500 });
      }
      insertedCrew = insertResult.data || [];
    }

    // Process positions for each crew member
    const positionPromises = insertedCrew.map(async (crew, index) => {
      const originalRow = crewToInsert[index];
      if (originalRow.position && originalRow.department) {
        try {
          await processRole(
            { title: originalRow.position } as CallSheetMemberType,
            crew,
            [originalRow.department],
            supabase
          );
        } catch (error) {
          errors.push(`Failed to create position for ${crew.name}: ${error}`);
        }
      }
    });

    await Promise.all(positionPromises);

    // Overwrite existing crew if needed
    let updatedCount = 0;
    if (overwriteMode === 'overwrite' && crewToUpdate.length > 0) {
      for (const row of crewToUpdate) {
        const match = existingCrew.find(c => (row.email && c.email?.toLowerCase() === row.email.toLowerCase()) || (row.phone && c.phone === row.phone));
        if (match) {
          // Merge notes: append new note to existing note
          const mergedNote = [match.note, row.note].filter(Boolean).join('\n');
          const [first_name, last_name] = makeName(row.name);
          await supabase.from('company_crew_member').update({
            name: row.name,
            first_name,
            last_name,
            email: row.email || null,
            phone: row.phone || null,
            city: row.city || null,
            state: row.state || null,
            note: mergedNote || null,
          }).eq('id', match.id);
          updatedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported: insertedCrew.length,
      updated: updatedCount,
      skipped: skippedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully imported ${insertedCrew.length} crew members${updatedCount ? ", updated " + updatedCount : ""}${skippedCount ? ", skipped " + skippedCount : ""}`
    });

  } catch (error) {
    console.error('Bulk import error:', error);
    return NextResponse.json({ 
      error: 'Internal server error during import',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

