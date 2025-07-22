import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { CallSheet } from "@/components/blocks/CallSheet";
import { NavLayout } from "@/components/ui/Nav/NavLayout";
import { HistoricalCallSheet } from "@/components/blocks/CallSheet/HistoricalCallSheet";
import { ParseSteps } from "@/components/blocks/Parse/ParseSteps";

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
      project (
        id
      )
    `
    )
    .eq("short_id", id)
    .single();

  return (
    <NavLayout project={callSheetData?.project?.id}>
      <main className="min-w-screen min-h-screen flex flex-col">
        <div className="flex flex-1 p-4 gap-4 sm:p-12 !pt-0 w-full max-w-[1728px] mx-auto max-sm:overflow-x-hidden max-sm:px-0 max-sm:flex-0">
          {/* @ts-ignore */}
          <ParseSteps data={callSheetData} />
        </div>
      </main>
    </NavLayout>
  );
}
