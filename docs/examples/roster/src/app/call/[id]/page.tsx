import { CallCard } from "@/components/blocks/CallCard";
import { createClient } from "@/lib/supabase/server";
import { normalizeCallSheetMember } from "@/lib/utils";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Page({ params }: { params: { id: string } }) {
  const supabase = createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect(`/call/${params.id}/sign-in`);
    }

    //--TODO: related project_member record returning null here.
    const { data } = await supabase
      .from("call_sheet_member")
      .select(
        `
        *,

        project_position(*, project_member(*))
      `
      )
      .eq("short_id", params.id)
      .single();

    const member = normalizeCallSheetMember(data);

    /*
    TODO: check for if logged in user is the owner of the call sheet member otherwise redirect out 
  */

    if (!member?.call_sheet) return <>No call sheet data for member found.</>;

    const { data: callSheetData } = await supabase
      .from("call_sheet")
      .select(
        `
      *,
      project (
        contact_info_visible
      )
    `
      )
      .eq("id", member?.call_sheet)
      .single();

    if (!callSheetData?.company) return <></>;

    const { data: company } = await supabase
      .from("company")
      .select()
      .eq("id", callSheetData?.company)
      .single();

    if (!member?.owner) {
      await supabase
        .from("call_sheet_member")
        .update({ owner: user.id })
        .eq("id", member?.id);
    }

    if (!company) return <></>;

    return (
      <>
        <CallCard
          member={member}
          sheet={callSheetData}
          company={company}
          user={user}
          contactInfoVisible={
            callSheetData.project?.contact_info_visible ?? true
          }
        />
      </>
    );
  } catch (error) {
    await supabase.auth.signOut();

    redirect(`/call/${params.id}/sign-in`);
  }
}
