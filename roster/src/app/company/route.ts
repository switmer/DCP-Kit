import { Database } from "@/types/supabase";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createRouteHandlerClient<Database>({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ company: null });
  }

  const companyId = cookies().get("activeCompany")?.value;

  const query = supabase.from("company_user").select("company ( * )");

  if (companyId) {
    query.eq("company", companyId);
  } else {
    query.eq("user", user.id);
  }

  const { data: company } = await query.then((q) => {
    return {
      data: q.data?.[0]?.company,
    };
  });

  if (company) {
    cookies().set("activeCompany", company.id);
  }

  if (!company) {
    const { data: newCompany } = await supabase
      .from("company")
      .insert({ id: user.id })
      .select("*")
      .single();

    await supabase.from("company_user").insert({
      company: newCompany?.id,
      user: user.id,
    });

    cookies().set("activeCompany", newCompany?.id ?? "");

    return NextResponse.json({ company: newCompany });
  }

  return NextResponse.json({ company });
}
