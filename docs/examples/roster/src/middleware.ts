import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/middleware";
import PostHogClient from "./posthog/server";

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request);
  try {
    const res = await supabase.auth.getSession();

    const hasActiveCompany = !!request.cookies.get("activeCompany")?.value;

    if (
      !hasActiveCompany &&
      !request.nextUrl.pathname.startsWith("/call") &&
      !request.nextUrl.pathname.startsWith("/auth") &&
      !request.nextUrl.pathname.startsWith("/callsheet-pdfs") &&
      !request.nextUrl.pathname.startsWith("/api") &&
      !request.nextUrl.pathname.startsWith("/sms")
    ) {
      await supabase
        .from("company_user")
        .select()
        .eq("user", res.data.session?.user.id)
        .single()
        .then(({ data }) => {
          if (!data) {
            throw new Error("No company found");
          }

          response.cookies.set("activeCompany", data.company);
        });
    }

    if (res.data.session?.user?.id) {
      const posthog = PostHogClient();
      if (posthog) {
        posthog.identify({
          distinctId: res.data.session?.user?.id,
          properties: {
            email: res.data.session?.user?.email,
            phone: res.data.session?.user?.phone,
            name: res.data.session?.user?.user_metadata?.name,
          },
        });
      }
    }

    return response;
  } catch (e) {
    if (
      request.nextUrl.pathname.startsWith("/crew") ||
      request.nextUrl.pathname.startsWith("/sheet") ||
      request.nextUrl.pathname === "/"
    ) {
      supabase.auth.signOut();
    }

    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
