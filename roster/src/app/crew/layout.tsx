import { Sidebar } from '@/components/blocks/CrewTable/Sidebar';
import { NavLayout } from '@/components/ui/Nav/NavLayout';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Crew } from '@/components/blocks/Crew';
import React from 'react';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/sign-in');
  }

  return (
    <NavLayout>
      <main className="min-w-screen min-h-screen flex flex-col relative">
        <Crew>
          <div className="flex overflow-hidden max-w-screen max-h-screen">
            <Sidebar />

            {children}
          </div>
        </Crew>
      </main>
    </NavLayout>
  );
}
