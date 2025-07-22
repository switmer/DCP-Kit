'use client';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import usePreventAutoFocus from '@/lib/hooks/usePreventAutoFocus';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Formik, FormikValues } from 'formik';
import { toast } from 'sonner';

export const CreateCompanyDialog: React.FC<{
  open: boolean;
  setOpen: (open: boolean) => void;
  onDone: (id: string) => void;
  user: string;
}> = ({ open, setOpen, onDone, user }) => {
  const supabase = createClient();

  const prevent = usePreventAutoFocus();

  return (
    <Dialog defaultOpen={open} open={open} onOpenChange={(open) => !open && setOpen(false)}>
      <DialogContent {...prevent}>
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>Create a new company</DialogTitle>
            <button
              onClick={() => setOpen(false)}
              className="w-10 h-10 flex justify-center items-center rounded-[10px] bg-zinc-900 bg-opacity-80 hover:bg-opacity-100 duration-100"
            >
              <Icon name="cross" className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </DialogHeader>
        <Formik
          initialValues={{
            name: '',
          }}
          validateOnChange={true}
          validateOnMount={false}
          onSubmit={async (values: FormikValues) => {
            return await supabase
              .from('company')
              .insert({
                name: values?.name,
              })
              .select()
              .single()
              .then(async ({ data, error }) => {
                if (error) {
                  toast.error(error.message);
                  return;
                }

                await supabase.from('company_user').insert({
                  company: data?.id,
                  user,
                });

                toast.success(`Welcome ${data?.name}!`);
                setOpen(false);
                onDone(data?.id);
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
                    Create
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
