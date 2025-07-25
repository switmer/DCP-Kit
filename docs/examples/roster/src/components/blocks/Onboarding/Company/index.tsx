'use client';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Formik, FormikValues } from 'formik';
import { useRouter } from 'next-nprogress-bar';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export const OnboardingCompanyDialog: React.FC<{
  visible: boolean;
  companyId?: string;
}> = ({ visible, companyId }) => {
  const [isMounted, setIsMounted] = useState(false);

  const router = useRouter();
  const [open, setOpen] = useState(visible);
  const supabase = createClient();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!companyId || !isMounted) {
    return <></>;
  }

  return (
    <Dialog defaultOpen={open} open={open}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Tell us a bit more about you</DialogTitle>
        </DialogHeader>
        <Formik
          initialValues={{
            name: '',
            subdomain: '',
          }}
          validateOnChange={true}
          onSubmit={async (values: FormikValues) => {
            return await supabase
              .from('company')
              .update({
                name: values?.name,
                subdomain: values?.subdomain,
              })
              .eq('id', companyId)
              .select()
              .single()
              .then(({ data, error }) => {
                if (error) {
                  toast.error(error.message);
                  return;
                }

                toast.success(`Welcome ${data?.name}!`);
                setOpen(false);
                router.refresh();
              });
          }}
        >
          {({ isValidating, isValid, dirty, touched, errors, submitForm }) => {
            return (
              <>
                <div className="p-8 flex flex-col gap-5">
                  <Label className="flex flex-col gap-2">
                    Company Name
                    <Input
                      autoFocus
                      className={cn(
                        'h-11 bg-zinc-900 !rounded-lg shadow border border-zinc-700 placeholder:text-zinc-500 text-base focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40',
                        !errors?.name && !!touched?.name && '!border-lime-300',
                        !!errors?.name && !!touched?.name && '!border-pink-600',
                      )}
                      label="Company Name"
                      name="name"
                      placeholder="e.g Smuggler"
                      validate={(value: string) => {
                        if (!value) {
                          return 'Name is required';
                        }
                      }}
                    />
                    {!!errors?.name && !!touched?.name && (
                      <div className=" h-8 px-3 py-2 bg-pink-600 bg-opacity-10 rounded-md items-center flex gap-1">
                        <Icon name="error" className="w-4 h-4 text-pink-600" />
                        <div className="font-normal text-pink-600 text-xs leading-none">{errors?.name as string}</div>
                      </div>
                    )}
                  </Label>
                </div>
                <DialogFooter>
                  <Button
                    className="px-4 disabled:bg-opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed"
                    variant="accent"
                    size="compact"
                    disabled={!isValid || isValidating || !dirty}
                    onClick={submitForm}
                  >
                    Continue
                  </Button>
                </DialogFooter>
              </>
            );
          }}
        </Formik>
      </DialogContent>
    </Dialog>
  );
};
