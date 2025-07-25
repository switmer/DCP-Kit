import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CrewTable } from '@/components/blocks/CrewTable';
import { CrewTableMobile } from '@/components/blocks/CrewTableMobile';

export default async function Crew() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/sign-in');
  }

  return (
    <>
      <div className="max-sm:hidden">
        <CrewTable />
      </div>

      <div className="[@media(min-width:601px)]:hidden">
        <CrewTableMobile />
      </div>
    </>
  );
}
