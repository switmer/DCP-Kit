import {
  Availability,
  CrewingContactAttemptWithRelations,
} from "@/components/blocks/Crewing/Availability";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Page({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data } = await supabase
    .from("crewing_contact_attempt")
    .select(
      `
        *,
        crewing_position_crew (
          *,
          crew (
            *,
            company (
                *
            )
          )
        ),
        crewing_position (
            *,
            project (
                *
            )
        )
    `
    )
    .eq("short_id", params.id)
    .single();

  if (!data) {
    redirect(`/`);
  }

  return <Availability data={data as CrewingContactAttemptWithRelations} />;
}
