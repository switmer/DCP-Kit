"use client";
import { useSignIn } from "@/lib/sign-in-context";
import { Logo } from "../Logo";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { cn } from "@/lib/utils";
import { redirect } from "next/navigation";
import { formatPhoneNumber } from "@/lib/phone";
import { toast } from "sonner";

export const ConfirmSignInForm: React.FC<{
  call?: boolean;
  callId?: string;
}> = ({ call, callId }) => {
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [isInputFocused, setInputFocused] = useState(false);
  const supabase = createClient();
  const { phone, email, segment, updatePhone, updateEmail } = useSignIn();
  const [resending, setResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

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
        .then(({ error }) => {
          if (error) {
            setOtpError(error.message);
            setLoading(false);
            setOtp("");
            return;
          }

          if (!call) {
            fetch("/company").then(() => {
              window.location.href = "/";
            });
          } else {
            const { formattedPhone } = formatPhoneNumber(updatePhone);

            supabase
              .from("call_sheet_member")
              .select(`project_position(*)`)
              .eq("short_id", callId as string)
              .single()
              .then(({ data }) => {
                if (!data?.project_position?.project_member) {
                  fetch("/member").then(() => {
                    window.location.href = `/call/${callId}`;
                  });
                  return;
                }

                supabase
                  .from("project_member")
                  .update({
                    ...(updatePhone && {
                      phone: formattedPhone || updatePhone,
                    }),
                    ...(updateEmail && { email: updateEmail }),
                  })
                  .eq("id", data.project_position?.project_member)
                  .then(() => {
                    fetch("/member").then(() => {
                      window.location.href = `/call/${callId}`;
                    });
                  });
              });
          }
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, otp, phone, segment]);

  if (!phone && !email) {
    return redirect(!call ? "/auth/sign-in" : `/call/${callId}/sign-in`);
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
            <button
              disabled={resending || resendTimer > 0}
              onClick={async () => {
                if (resending || resendTimer > 0) return;

                setResending(true);
                if (phone && segment === "Phone Number") {
                  const { formattedPhone, error } = formatPhoneNumber(phone);
                  if (error || !formattedPhone) {
                    setResending(false);
                    toast.error(error ?? "Invalid phone number format", {
                      duration: 5000,
                    });
                    return;
                  }

                  const { error: authError } =
                    await supabase.auth.signInWithOtp({
                      phone: formattedPhone,
                    });

                  if (authError) {
                    setResending(false);
                    toast.error(authError.message, {
                      duration: 5000,
                    });
                    return;
                  }
                } else {
                  const { error: authError } =
                    await supabase.auth.signInWithOtp({
                      email,
                      options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                      }
                    });

                  if (authError) {
                    setResending(false);
                    toast.error(authError.message, {
                      duration: 5000,
                    });
                    return;
                  }
                }

                setResending(false);
                setResendTimer(30);

                ref.current?.focus();
              }}
              className="text-sm w-full text-left font-medium text-white/60 hover:text-white/80 duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending ? (
                <div className="flex items-center gap-1">
                  Sending...
                  <div className="w-4 h-4">
                    <LoadingIndicator size="xsmall" />
                  </div>
                </div>
              ) : resendTimer > 0 ? (
                `You can resend the code in ${resendTimer}s`
              ) : (
                "Resend code"
              )}
            </button>
          </>
        )}
      </div>
    </>
  );
};
