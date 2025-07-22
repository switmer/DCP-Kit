import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ company: null });
  }

  const { data: member } = await supabase
    .from("member")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!member) {
    const { data: newMember } = await supabase
      .from("member")
      .insert({ id: user.id })
      .select("*")
      .single();

    return NextResponse.json({ member: newMember });
  }

  return NextResponse.json({ member });
}
