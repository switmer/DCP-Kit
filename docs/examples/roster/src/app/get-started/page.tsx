import { Icon } from "@/components/ui/Icon";
import { NavLayout } from "@/components/ui/Nav/NavLayout";
import { UploadButton } from "@/components/ui/Upload";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import Image from "next/image";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  return (
    <NavLayout>
      <main className="px-4 flex justify-center items-center flex-col relative min-w-screen min-h-screen">
        <Icon
          name="logo-motif"
          className="w-[58px] h-[58px] text-accent mb-[64px]"
        />
        <p className="text-accent text-xl mb-3 text-center">
          Send better call <span className="line-through">sheets</span> cards
        </p>
        <h1 className="font-serif mb-3 text-[55px] leading-tight text-center md:text-[70px]">
          See how it works
        </h1>
        <UploadButton />
      </main>
    </NavLayout>
  );
}
