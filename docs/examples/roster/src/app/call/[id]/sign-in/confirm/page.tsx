import { ConfirmSignInForm } from "@/components/blocks/Auth/ConfirmSignIn";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function SignIn({ params }: { params: { id: string } }) {
  const supabase = createClient();

  /* TODO: eventually check if same owner */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(`/call/${params.id}`);
  }

  return (
    <main className="md:pt-[200px] pt-[90px] pb-6">
      <ConfirmSignInForm call callId={params.id} />
    </main>
  );
}
