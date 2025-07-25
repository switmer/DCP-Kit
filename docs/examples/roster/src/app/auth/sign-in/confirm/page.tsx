import { ConfirmSignInForm } from "@/components/blocks/Auth/ConfirmSignIn";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function SignIn() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="md:pt-[200px] pt-[90px] pb-6">
      <ConfirmSignInForm />
    </main>
  );
}
