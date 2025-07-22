import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { CallSheet } from "@/components/blocks/CallSheet";
import { NavLayout } from "@/components/ui/Nav/NavLayout";
import { HistoricalCallSheet } from "@/components/blocks/CallSheet/HistoricalCallSheet";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Parse } from "@/components/blocks/Parse";

export default async function Page() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  return (
    <main className="min-w-screen min-h-screen flex flex-col">
      <div className="flex flex-col p-6 py-10 gap-6 justify-start">
        <div className="text-white text-3xl max-sm:text-[26px] max-sm:leading-5">
          Admin call sheet parser
        </div>
        <Parse />
      </div>
    </main>
  );
}
