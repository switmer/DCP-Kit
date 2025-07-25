import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { NavLayout } from '@/components/ui/Nav/NavLayout';
import { RefreshableCallSheet } from '@/components/blocks/CallSheet/RefreshableCallSheet';

export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/sign-in');
  }

  const { data: callSheetData } = await supabase
    .from('call_sheet')
    .select(
      `
      *,
      company (
        name,
        id
      ),
      project (
        *,
        project_entity(
          *,
          entity_point_of_contact(*)
        )
      )
    `,
    )
    .eq('short_id', id)
    .single();

  const { data: callSheetSrcData } = await supabase.storage
    .from('call-sheets')
    .createSignedUrl(callSheetData?.src ?? '', 86400); //-- 86400 seconds = 1 day.

  return (
    <NavLayout project={callSheetData?.project?.id}>
      <main className="min-w-screen min-h-screen flex flex-col">
        <div className="flex flex-1 p-4 gap-4 sm:p-12 !pb-[120px] !pt-0 w-full max-w-[1728px] mx-auto max-sm:overflow-x-hidden max-sm:px-0 max-sm:flex-0">
          <RefreshableCallSheet shortId={id} src={callSheetSrcData?.signedUrl} sheet={callSheetData} />
        </div>
      </main>
    </NavLayout>
  );
}
