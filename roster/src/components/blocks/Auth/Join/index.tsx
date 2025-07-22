"use client";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";

import { useSignIn } from "@/lib/sign-in-context";
import { createClient } from "@/lib/supabase/client";
import { Form, Formik } from "formik";
import { useRouter } from "next-nprogress-bar";
import { ChangeEvent, useEffect, useState } from "react";
import { Logo } from "../Logo";
import { Database } from "@/types/supabase";

export const JoinForm: React.FC<{
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
  const { setPhone, setEmail } = useSignIn();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setPhone("");
    setEmail("");
  }, [setEmail, setPhone]);

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
          <div className="flex flex-col gap-4">
            <p className="text-center text-md text-foregroundMuted font-bold">
              Continue with your email
            </p>

            <Formik
              validateOnBlur={true}
              validateOnChange={false}
              initialValues={{
                email: invite.email,
              }}
              onSubmit={async ({ email }) => {
                setLoading(true);

                await supabase.auth
                  .signInWithOtp({
                    email,
                  })
                  .catch(() => {
                    setLoading(false);
                  });

                setEmail(email);
                router.push(`/auth/join/${invite.token}/confirm`);
              }}
            >
              {({ handleChange, errors }) => {
                return (
                  <Form className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2 relative">
                      <Input
                        type="email"
                        placeholder="Email"
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          handleChange(e);
                        }}
                        disabled
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
                                <strong>Can you try again?</strong> Doesn’t look
                                like a valid email.
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
                    <Button>Send Code</Button>
                  </Form>
                );
              }}
            </Formik>
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
