import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createClient();

  const body: {
    project: string;
    targetProjectPositionId: string;
    crew: {
      id: number;
      position: string;
      department?: string;
    }[];
  } = await request.json();

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

  const { data: crewMembers, error: crewMembersError } = await supabase
    .from('company_crew_member')
    .select('*')
    .eq('company', companyId)
    .in(
      'id',
      body.crew.map((c) => c.id),
    );

  if (crewMembersError) {
    return NextResponse.json({ data: null, error: crewMembersError.message });
  }

  let allProjectMembers: { id: number; crew: number | null }[] = [];

  const { data: projectMembers, error: projectMembersError } = await supabase
    .from('project_member')
    .select('id, crew')
    .eq('project', body.project)
    .in(
      'crew',
      crewMembers.map((c) => c.id),
    );

  if (projectMembersError) {
    return NextResponse.json({ data: null, error: projectMembersError.message });
  }

  allProjectMembers = [...projectMembers];

  const existingCrewIds = new Set(projectMembers?.map((member) => member.crew) || []);
  const crewMembersToAdd = crewMembers?.filter((crew) => !existingCrewIds.has(crew.id)) || [];

  if (!!crewMembersToAdd?.length) {
    const projectMembersToInsert = crewMembersToAdd.map((crew) => ({
      name: crew.name,
      email: crew.email,
      phone: crew.phone,
      project: body.project,
      crew: crew.id,
    }));

    const { data: newProjectMembers, error: insertError } = await supabase
      .from('project_member')
      .insert(projectMembersToInsert)
      .select('id, crew');

    if (insertError) {
      return NextResponse.json({ data: null, error: insertError.message });
    }

    allProjectMembers = [...allProjectMembers, ...newProjectMembers];
  }

  if (body.targetProjectPositionId && allProjectMembers?.[0]?.id) {
    const { error: updateError } = await supabase
      .from('project_position')
      .update({
        project_member: allProjectMembers[0].id,
      })
      .eq('id', body.targetProjectPositionId);

    if (updateError) {
      return NextResponse.json({ data: null, error: updateError.message });
    }

    return NextResponse.json({ data: true });
  }

  const projectPositionsToAdd = allProjectMembers.map((member) => {
    const crew = body.crew.find((c) => c.id === member.crew);

    return {
      project: body.project,
      title: crew?.position,
      department: crew?.department,
      project_member: member.id,
    };
  });

  const { error: insertError } = await supabase.from('project_position').insert(projectPositionsToAdd);

  if (insertError) {
    return NextResponse.json({ data: null, error: insertError.message });
  }

  return NextResponse.json({ data: true });
}
