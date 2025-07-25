import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { CallSheet } from "@/components/blocks/CallSheet";
import { NavLayout } from "@/components/ui/Nav/NavLayout";

export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params;

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const { data: callSheetData } = await supabase
    .from("call_sheet")
    .select(
      `
      *,
      company (
        name,
        id
      ),
      project (
        id,
        name,
        dates,
        prep_dates,
        post_dates,
        type,
        job_number,
        contact_info_visible
      )
    `
    )
    .eq("short_id", id)
    .single();

  if (!callSheetData || !callSheetData.project) {
    return;
  }

  const { data: callSheetSrcData } = await supabase.storage
    .from("call-sheets")
    .createSignedUrl(callSheetData?.src ?? "", 86400); //-- 86400 seconds = 1 day.

  return (
    <NavLayout project={callSheetData?.project?.id}>
      <main className="min-w-screen min-h-screen flex flex-col relative">
        <div className="p-4 gap-4 sm:p-12 !pt-0 flex-1 flex max-w-[1728px] w-full mx-auto overflow-x-scroll">
          <CallSheet
            src={callSheetSrcData?.signedUrl}
            sheet={callSheetData}
            // project={projectData}
            forceLive
          />
        </div>
      </main>
    </NavLayout>
  );
}
