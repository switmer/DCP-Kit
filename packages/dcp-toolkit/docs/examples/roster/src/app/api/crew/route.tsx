import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { makeName } from '@/lib/utils';
import { CallSheetMemberType } from '@/types/type';
import { processRole } from '@/lib/processRole';

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ data: null, error: 'Not found' });
  }

  const companyId = cookies().get('activeCompany')?.value;

  if (!companyId) {
    return NextResponse.json({ data: null, error: 'Not found' });
  }

  const body: {
    name: string;
    email: string;
    phone: string;
    position: string;
    department: string;
    state: string;
    city: string;
  } = await request.json();

  const [first_name, last_name] = makeName(body.name);

  const { data: crew, error: crewError } = await supabase
    .from('company_crew_member')
    .insert({
      company: companyId,
      email: body.email ? body.email : null,
      phone: body.phone ? body.phone : null,
      city: body.city ? body.city : null,
      state: body.state ? body.state : null,
      name: body.name,
      first_name,
      last_name,
    })
    .select('*')
    .single();

  if (crewError) {
    return NextResponse.json({ data: null, error: crewError });
  }

  await processRole({ title: body.position } as CallSheetMemberType, crew, [body.department], supabase);

  const { data, error } = await supabase
    .from('company_crew_member')
    .select(
      `*,
    position!inner(
      *
    )`,
    )
    .eq('id', crew.id)
    .single();

  return NextResponse.json({ data: { ...(data ?? {}), call_sheet_member: [] }, error });
}

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ data: null, error: 'Not found' });
  }

  const companyId = cookies().get('activeCompany')?.value;

  if (!companyId) {
    return NextResponse.json({ data: null, error: 'Not found' });
  }

  const url = new URL(request.url);
  const locations = url.searchParams.getAll('locations');
  const positions = url.searchParams.getAll('positions');
  const search = url.searchParams.get('search') || '';
  const page = parseInt(url.searchParams.get('page') || '0');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
  const departments = url.searchParams.getAll('departments');
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const positionJoinType = !!positions.length || !!departments.length ? 'inner' : 'left';
  const locationJoinType = !!locations.length ? 'inner' : 'left';

  const baseQuery = supabase
    .from('company_crew_member')
    .select(
      `*,
      position!${positionJoinType}(
        *
      ),
      call_sheet_member!${locationJoinType}(
        id,
        call_sheet!${locationJoinType}(
          id,
          call_sheet_location!${locationJoinType}(
            id,
            location!${locationJoinType}(id)
        )
      )
    )`,
      { count: 'exact' },
    )
    .eq('company', companyId);

  if (!!locations?.length) {
    baseQuery.in('call_sheet_member.call_sheet.call_sheet_location.location', locations);
  }

  if (!!positions.length) {
    baseQuery.or(positions.map((p) => `name.eq."${p.toLocaleLowerCase()}"`).join(', '), { foreignTable: 'position' });
  }

  if (!!departments.length) {
    baseQuery.overlaps('position.department', departments);
  }

  if (!!search) {
    const searchTerm = `%${search?.toLocaleLowerCase()}%`;
    baseQuery.or(`name.ilike.${searchTerm},phone.ilike.${searchTerm}`);
  }

  const { data, error, count } = await baseQuery.range(from, to);

  if (error) {
    return NextResponse.json({ data: null, error });
  }

  const hasMore = count ? from + data.length < count : false;

  return NextResponse.json({
    data: data ?? [],
    error,
    count,
    hasMore,
    page,
    pageSize,
    totalPages: count ? Math.ceil(count / pageSize) : 0,
  });
}
