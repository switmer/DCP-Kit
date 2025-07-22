import { SignInForm } from "@/components/blocks/Auth/SignIn";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { JoinForm } from "@/components/blocks/Auth/Join";

export default async function Page({ params }: { params: { token: string } }) {
  const { token } = params;

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.auth.signOut();
  }

  const { data: inviteData } = await supabase
    .from("company_user_invite")
    .select("*")
    .eq("token", token)
    .single();

  if (
    !inviteData ||
    inviteData.used ||
    new Date(inviteData.expires_at) < new Date()
  ) {
    redirect("/auth/sign-in");
  }

  return (
    <main className="md:pt-[200px] pt-[90px] pb-6">
      <JoinForm invite={inviteData} />
    </main>
  );
}
