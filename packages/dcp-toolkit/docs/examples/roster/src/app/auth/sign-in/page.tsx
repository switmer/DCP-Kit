import { SignInForm } from "@/components/blocks/Auth/SignIn";
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
    <main className="md:pt-[200px] pt-[90px] pb-6" suppressHydrationWarning>
      <SignInForm />
    </main>
  );
}
