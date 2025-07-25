import { Dashboard } from '@/components/blocks/Dashboard';
import { OnboardingCompanyDialog } from '@/components/blocks/Onboarding/Company';
import { Icon } from '@/components/ui/Icon';
import { NavLayout } from '@/components/ui/Nav/NavLayout';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCompany } from '@/queries/get-company';

export default async function Home() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/sign-in');
  }

  const activeCompany = cookies().get('activeCompany')?.value;

  const { data: company } = await getCompany(supabase, user.id, activeCompany);

  return (
    <NavLayout>
      <main
        className={
          'min-w-screen min-h-screen max-h-screen flex flex-col gap-6 relative px-12 py-0 max-sm:px-4 max-sm:bg-[radial-gradient(104.75%_62.17%_at_50%_88.51%,rgba(202,252,102,0.20)_0%,rgba(0,0,0,0.00)_100%)]'
        }
      >
        <div className="flex gap-12 flex-1 overflow-hidden max-sm:flex-col">
          <div className="w-full gap-6 flex-1 flex flex-col py-12 overflow-scroll hide-scrollbars">
            <div className="flex text-zinc-600 text-sm leading-none gap-2 items-center max-sm:hidden">
              <Icon name="home" className="w-5 h-5" />

              {company?.name}
            </div>

            <Dashboard />
          </div>

          {/*<div className="flex-1 max-w-[440px] pb-12 overflow-scroll max-sm:hidden max-sm:hide-scrollbars">*/}
          {/*  <Activity />*/}
          {/*</div>*/}
        </div>

        <OnboardingCompanyDialog visible={!company?.name} companyId={company?.id} />
      </main>
    </NavLayout>
  );
}
