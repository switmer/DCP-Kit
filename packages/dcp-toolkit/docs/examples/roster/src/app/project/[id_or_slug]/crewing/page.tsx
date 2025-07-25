import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { NavLayout } from "@/components/ui/Nav/NavLayout";
import { getProject } from "@/queries/get-project";

import { CrewingContent } from "@/components/blocks/Crewing/Content";
import { CrewingProjectInfo } from "@/components/blocks/Crewing/ProjectInfo";

export default async function Page({
  params,
}: {
  params: { id_or_slug: string };
}) {
  const { id_or_slug } = params;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const { data } = await getProject(supabase, id_or_slug);

  return (
    <NavLayout project={data?.id}>
      <main className="min-w-screen min-h-screen flex flex-col">
        <div className="flex flex-1 p-4 gap-4 sm:p-12 !pt-0 w-full max-w-[1728px] mx-auto max-sm:overflow-x-hidden max-sm:px-0 max-sm:flex-0">
          <div className="flex flex-col pt-4 w-full sm:pt-12 max-w-[1440px]">
            <Breadcrumbs
              name={data?.company?.name}
              items={[
                {
                  name: data?.name,
                  href: `/project/${data?.slug ?? data?.id}`,
                },
              ]}
            />

            {!!data && <CrewingProjectInfo data={data} />}

            <CrewingContent project={data?.id} type={data?.type} />
          </div>
        </div>
      </main>
    </NavLayout>
  );
}
