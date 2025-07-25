import { Users } from "@/components/blocks/Settings/Users";
import { createClient } from "@/lib/supabase/server";
import { getCompany } from "@/queries/get-company";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Page() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const activeCompany = cookies().get("activeCompany")?.value;

  const { data: company } = await getCompany(supabase, user.id, activeCompany);

  return <Users company={company} user={user} />;
}
