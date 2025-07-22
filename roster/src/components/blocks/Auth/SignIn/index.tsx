"use client";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { SignInSegment, useSignIn } from "@/lib/sign-in-context";
import { createClient } from "@/lib/supabase/client";
import { Form, Formik } from "formik";
import { useRouter } from "next-nprogress-bar";
import { ChangeEvent, useEffect, useState } from "react";
import { isValidPhoneNumber, parsePhoneNumber } from "react-phone-number-input";
import { Logo } from "../Logo";
import Cookies from "js-cookie";
import { Segment } from "../Segment";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import { formatPhoneNumber } from "@/lib/phone";

export const SignInForm: React.FC<{
  call?: boolean;
  callId?: string;
  email?: string;
  phone?: string;
  id?: string;
  callSheet?: string;
  company?: string;
}> = ({ call, callId, email, phone, id, callSheet, company }) => {
  const {
    setPhone,
    segment,
    setSegment,
    setEmail,
    setUpdateEmail,
    setUpdatePhone,
  } = useSignIn();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    Cookies.remove("activeCompany", { path: "/" });
  }, []);

  useEffect(() => {
    setPhone("");
    setEmail("");
  }, [setEmail, setPhone]);

  useEffect(() => {
    if (!call) return;

    if (email && !phone) {
      setSegment(SignInSegment.Email);
    }
  }, [call, email, phone]);

  if (loading) {
    return (
      <>
        <Logo />
        <div className="mx-auto flex flex-col gap-6 max-w-[418px] px-6 w-full">
          {loading && <LoadingIndicator />}
        </div>
      </>
    );
  }

  return (
    <>
      <Logo />
      <div className="mx-auto flex flex-col gap-6 max-w-[418px] px-6 w-full">
        <>
          {!call && (
            <>
              <Button
                className="w-full"
                variant="accent"
                onClick={async () => {
                  setLoading(true);
                  ("use server");
                  await supabase.auth
                    .signInWithOAuth({
                      provider: "google",
                      options: {
                        redirectTo: call
                          ? `${location.origin}/auth/call/callback?next=/call/${callId}`
                          : `${location.origin}/auth/callback`,
                      },
                    })
                    .catch(() => {
                      setLoading(false);
                    });
                }}
              >
                <Icon name="google" className="w-5 h-5" />
                Continue with Google
              </Button>
              <div className="h-6 flex items-center justify-between gap-6 text-md text-foregroundMuted font-medium">
                <span className="h-[1px] flex-1 bg-foreground opacity-25"></span>
                or
                <span className="h-[1px] flex-1 bg-foreground opacity-25"></span>
              </div>
            </>
          )}
          <div className="flex flex-col gap-4">
            <p className="text-center text-md text-foregroundMuted font-bold">
              Continue with your phone or email
            </p>
            {(!call || (call && email && phone)) && (
              <Segment
                segments={[SignInSegment.PhoneNumber, SignInSegment.Email]}
                setSegment={setSegment}
                value={segment}
              />
            )}
            {segment === "Phone Number" && (
              <Formik
                validateOnBlur={true}
                validateOnChange={false}
                enableReinitialize={true}
                initialValues={{
                  phone: phone ?? "",
                  ...(call && !email && { email: "" }),
                }}
                onSubmit={async ({ phone, email }) => {
                  setLoading(true);

                  const { formattedPhone, error } = formatPhoneNumber(phone);
                  if (error || !formattedPhone) {
                    setLoading(false);
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
                    setLoading(false);
                    toast.error(authError.message, { duration: 5000 });
                    Sentry.captureException(authError);
                    return;
                  }

                  if (call) {
                    await supabase.from("notification_log").insert({
                      type: "call_card_login_phone",
                      call_sheet: callSheet,
                      call_sheet_member: id,
                      company,
                    });
                  }

                  setPhone(phone);

                  if (email) {
                    setUpdateEmail(email);
                  }

                  router.push(
                    !call
                      ? "/auth/sign-in/confirm"
                      : `/call/${callId}/sign-in/confirm`
                  );
                }}
              >
                {({
                  isValidating,
                  isValid,
                  dirty,
                  handleChange,
                  errors,
                  values,
                }) => {
                  return (
                    <Form className="flex flex-col gap-4">
                      <div
                        className={`flex flex-col gap-2 relative ${
                          errors.phone && "error"
                        }`}
                      >
                        {!call && (
                          <PhoneInput
                            name="phone"
                            placeholder="Phone number"
                            value={values.phone}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                              handleChange(e);
                            }}
                            disabled={call}
                            className={
                              errors.phone &&
                              `bg-pink-600 ring-4 ring-pink-600 ring-opacity-20 focus:ring-4 focus:ring-pink-600 focus:ring-opacity-20 bg-opacity-20 rounded-xl focus:border-pink-600 focus-visible:border-pink-600 border-pink-500`
                            }
                          />
                        )}
                        {call && (
                          <Input
                            name="phone"
                            placeholder="Phone number"
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                              handleChange(e);
                            }}
                            disabled={call}
                            className={
                              errors.phone &&
                              `bg-pink-600 ring-4 ring-pink-600 ring-opacity-20 focus:ring-4 focus:ring-pink-600 focus:ring-opacity-20 bg-opacity-20 rounded-xl focus:border-pink-600 focus-visible:border-pink-600 border-pink-500`
                            }
                          />
                        )}
                        {errors.phone && (
                          <>
                            <p className="text-pink-500 text-sm">
                              {errors.phone}
                            </p>
                            <Icon
                              name="error"
                              className="absolute text-pink-600 top-7 right-4  -translate-y-1/2 w-6 h-6"
                            />
                          </>
                        )}
                      </div>
                      {call && !email && (
                        <div className="flex flex-col gap-2 relative">
                          <Input
                            type="email"
                            name="email"
                            placeholder="Email"
                            onChange={handleChange}
                            className={errors.email && `error-class-styles`}
                          />
                          {errors.email && (
                            <>
                              <p className="text-pink-500 text-sm">
                                {errors.email}
                              </p>
                              <Icon
                                name="error"
                                className="absolute text-pink-600 top-7 right-4 -translate-y-1/2 w-6 h-6"
                              />
                            </>
                          )}
                        </div>
                      )}
                      <Button
                        disabled={
                          !isValid ||
                          isValidating ||
                          (!dirty && !call) ||
                          (!call && !isValidPhoneNumber(values.phone ?? ""))
                        }
                      >
                        Send Code To Phone
                      </Button>
                    </Form>
                  );
                }}
              </Formik>
            )}
            {segment === "Email" && (
              <Formik
                validateOnBlur={true}
                enableReinitialize={true}
                validateOnChange={false}
                initialValues={{
                  email: email ?? "",
                  ...(call && !phone && { phone: "" }),
                }}
                onSubmit={async ({ email, phone }) => {
                  setLoading(true);

                  const { error } = await supabase.auth.signInWithOtp({
                    email,
                    options: {
                      emailRedirectTo: `${window.location.origin}/auth/callback`,
                    }
                  });

                  if (error) {
                    setLoading(false);
                    toast.error(error.message, { duration: 5000 });
                    Sentry.captureException(error);
                    return;
                  }

                  if (call) {
                    await supabase.from("notification_log").insert({
                      type: "call_card_login_email",
                      call_sheet: callSheet,
                      call_sheet_member: id,
                      company,
                    });
                  }

                  setEmail(email);

                  if (phone) {
                    setUpdatePhone(phone);
                  }

                  router.push(
                    !call
                      ? "/auth/sign-in/confirm"
                      : `/call/${callId}/sign-in/confirm`
                  );
                }}
              >
                {({
                  isValidating,
                  isValid,
                  dirty,
                  handleChange,
                  errors,
                  values,
                }) => {
                  return (
                    <Form className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2 relative">
                        <Input
                          type="email"
                          placeholder="Email"
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            handleChange(e);
                          }}
                          disabled={call}
                          name="email"
                          className={
                            errors.email &&
                            `bg-pink-600 ring-4 ring-pink-600 ring-opacity-20 focus:ring-4 focus:ring-pink-600 focus:ring-opacity-20 bg-opacity-20 rounded-xl focus:border-pink-600 focus-visible:border-pink-600 border-pink-500`
                          }
                          validate={(value: string) => {
                            let error;
                            if (
                              !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(
                                value
                              )
                            ) {
                              error = (
                                <>
                                  <strong>Can you try again?</strong> Doesn’t
                                  look like a valid email.
                                </>
                              );
                            }
                            return error;
                          }}
                        />
                        {errors.email && (
                          <>
                            <p className="text-pink-500 text-sm">
                              {errors.email}
                            </p>
                            <Icon
                              name="error"
                              className="absolute text-pink-600 top-7 right-4  -translate-y-1/2 w-6 h-6"
                            />
                          </>
                        )}
                      </div>
                      {call && !phone && (
                        <div className="flex flex-col gap-2 relative">
                          <PhoneInput
                            name="phone"
                            placeholder="Phone number"
                            onChange={handleChange}
                            className={errors.phone && `error-class-styles`}
                          />
                          {errors.phone && (
                            <>
                              <p className="text-pink-500 text-sm">
                                {errors.phone}
                              </p>
                              <Icon
                                name="error"
                                className="absolute text-pink-600 top-7 right-4 -translate-y-1/2 w-6 h-6"
                              />
                            </>
                          )}
                        </div>
                      )}
                      <Button
                        disabled={
                          !isValid ||
                          isValidating ||
                          (!dirty && !call) ||
                          !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(
                            values.email
                          )
                        }
                      >
                        Send Code To Email
                      </Button>
                    </Form>
                  );
                }}
              </Formik>
            )}
          </div>
          <div className="text-xs text-[#999CA0] text-opacity-30">
            By signing up, you agree to Roster’s{" "}
            <a className="underline" href="">
              Privacy Policy
            </a>{" "}
            and{" "}
            <a className="underline" href="">
              Terms of Use
            </a>
            . You also agree to receive subsequent job related communication.
          </div>
        </>
      </div>
    </>
  );
};
