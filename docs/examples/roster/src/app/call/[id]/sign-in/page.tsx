import { SignInForm } from "@/components/blocks/Auth/SignIn";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import xior from "xior";

const axios = xior.create();

export default async function SignIn({ params }: { params: { id: string } }) {
  const supabase = createClient();

  /* TODO: eventually check if same owner */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(`/call/${params.id}`);
  }

  let { data } = await axios.post(
    `${process.env.NEXT_PUBLIC_SITE_URL}/call/${params.id}/check`
  );

  return (
    <main className="md:pt-[200px] pt-[90px] pb-6">
      <SignInForm
        call
        callId={params.id}
        email={data?.email}
        phone={data?.phone}
        id={data?.id}
        callSheet={data?.callSheet}
        company={data?.company}
      />
    </main>
  );
}
