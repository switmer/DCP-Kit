"use client";
import { useSignIn } from "@/lib/sign-in-context";
import { Logo } from "../Logo";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { cn } from "@/lib/utils";
import { redirect } from "next/navigation";
import { Database } from "@/types/supabase";
import { useCompanyStore } from "@/store/company";

export const ConfirmJoinForm: React.FC<{
  invite: {
    company: string | null;
    created_at: string | null;
    email: string;
    expires_at: string;
    id: string;
    role: Database["public"]["Enums"]["role"] | null;
    token: string;
    used: boolean | null;
  };
}> = ({ invite }) => {
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [isInputFocused, setInputFocused] = useState(false);
  const supabase = createClient();
  const { phone, email, segment } = useSignIn();
  const { setActiveCompany } = useCompanyStore();

  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (otpError && otp.length > 0) {
      setOtpError("");
    }

    if (otp.length === 6) {
      setLoading(true);
      ("use server");
      supabase.auth
        .verifyOtp(
          phone && segment === "Phone Number"
            ? { phone, token: otp, type: "sms" }
            : { email: email as string, token: otp, type: "email" }
        )
        .then(async ({ data, error }) => {
          if (error) {
            setOtpError(error.message);
            setLoading(false);
            setOtp("");
            return;
          }

          if (invite.company) {
            setActiveCompany(invite.company);
          }

          await supabase
            .from("company_user_invite")
            .update({ used: true })
            .eq("id", invite.id);

          await supabase.from("company_user").insert({
            company: invite.company,
            user: data?.user?.id,
            role: invite.role,
          });

          window.location.href = "/";
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, otp, phone, segment]);

  if (!phone && !email) {
    return redirect("/auth/sign-in");
  }

  return (
    <>
      <Logo />
      <div className="mx-auto flex flex-col gap-6 max-w-[418px] px-6 w-full">
        {loading ? (
          <LoadingIndicator />
        ) : (
          <>
            <label className="text-base">
              Enter the 6-digit code we just sent you
            </label>
            <div className="relative flex h-[72px] gap-2 group">
              <input
                ref={ref}
                className="left-0 right-0 opacity-0 absolute h-full"
                type="tel"
                value={otp}
                maxLength={6}
                onChange={(e) => setOtp(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                disabled={loading || otp.length === 6}
                autoFocus
              />
              {[...Array(6)].map((_, i) => {
                "use client";
                return (
                  <div
                    className={cn(
                      "w-[72px] flex-1 text-white text-lg border-[1.5px] border-transparent font-bold text-center justify-center items-center flex rounded-xl bg-stone-900",
                      i === otp.length && isInputFocused && `border-lime-300`
                    )}
                    key={i}
                  >
                    {otp[i]}
                  </div>
                );
              })}
            </div>
            {otpError && <p className="text-base text-pink-500">{otpError}</p>}
          </>
        )}
      </div>
    </>
  );
};
