import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getProject } from "@/queries/get-project";
import { ProjectCard } from "@/components/blocks/ProjectCard";

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

  const { data: company } = await supabase
    .from("company")
    .select()
    .eq("id", user.id)
    .single();

  if (!company) return <></>;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect(`/project/portal/${params.id_or_slug}/sign-in`);
    }

    const { data } = await getProject(supabase, id_or_slug);

    if (!data) return <></>;

    return (
      <>
        <ProjectCard user={user} company={company} project={data} />
      </>
    );
  } catch (error) {
    await supabase.auth.signOut();

    redirect(`/project/portal/${params.id_or_slug}/sign-in`);
  }
}
