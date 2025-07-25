import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContentPortless,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useSearchPositions } from "@/store/crew";
import { RateType } from "@/types/type";
import { Formik, FormikValues } from "formik";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export const ManageRate = ({
  rate: propRate,
  open,
  setOpen,
  onUpdate,
  crew,
  position,
}: {
  rate?: RateType | null;
  open: boolean;
  setOpen: (open: boolean) => void;
  onUpdate: () => void;
  crew: number;
  position: string;
}) => {
  const supabase = createClient();
  const [rateType, setRateType] = useState<"day" | "hour" | "week">("day");
  const { search: searchPositions } = useSearchPositions();

  const [rate, setRate] = useState<RateType | null | undefined>(propRate);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRate(propRate);
  }, [propRate]);

  const positionName = useMemo(() => {
    const rule = searchPositions(rate?.role || position);
    return rule?.position || position;
  }, [rate, position, searchPositions]);

  return (
    <Dialog
      defaultOpen={open}
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setOpen(false);
        }
        setOpen(o);
      }}
    >
      <DialogContentPortless
        className="gap-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>Editing a position</DialogTitle>
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
            rate: rate?.rate ?? "",
          }}
          onSubmit={async (values: FormikValues) => {
            if (!crew || !positionName) {
              return;
            }

            setLoading(true);

            const { error } = await supabase
              .from("role_rate")
              .upsert({
                id: rate?.id,
                currency: "USD",
                rate: !!values?.rate ? values.rate : null,
                role: positionName?.toLocaleLowerCase(),
                crew_member: crew,
                type: rateType,
              })
              .select();

            setLoading(false);

            if (error) {
              toast.error("Something went wrong");
              return;
            }
            onUpdate();
            setOpen(false);
          }}
          enableReinitialize
        >
          {({
            isValidating,
            isValid,
            dirty,
            touched,
            errors,
            values,
            submitForm,
          }) => {
            return (
              <>
                <div className="flex flex-col gap-3 p-6">
                  <div className="flex flex-col gap-2">
                    <div className="text-neutral-300 text-sm font-medium leading-tight">
                      Position
                    </div>

                    <div className="flex flex-col gap-[10px] p-3 bg-white bg-opacity-5 rounded-xl">
                      <div className="text-white text-lg font-medium">
                        {positionName}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="text-neutral-300 text-sm font-medium leading-tight">
                      Rate
                    </div>

                    <div className="relative">
                      <Input
                        className={cn(
                          "pl-[42px] h-14 pr-[14px] bg-zinc-900 !rounded-lg shadow border border-zinc-700 placeholder:text-zinc-500 text-[26px] focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40",
                          !!values?.rate &&
                            !errors?.rate &&
                            !!touched?.rate &&
                            "!border-lime-300",
                          !!errors?.rate &&
                            !!touched?.rate &&
                            "!border-pink-600"
                        )}
                        name="rate"
                        placeholder="--"
                        autoFocus
                        type="tel"
                        validate={(value: string) => {
                          if (!!value && !/^\d+$/.test(value)) {
                            return "Rate should be a number";
                          }
                        }}
                      />

                      <div className="text-neutral-300 text-[26px] absolute top-1/2 -translate-y-1/2 left-[14px]">
                        $
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger className="absolute px-[14px] h-11 right-0 top-1/2 -translate-y-1/2 flex justify-center items-center text-neutral-300 text-base capitalize gap-[2px]">
                          {rateType}
                          <Icon
                            name="chevron-small"
                            className="w-5 h-5 text-zinc-500 rotate-90"
                          />
                        </DropdownMenuTrigger>

                        <DropdownMenuContent
                          side="bottom"
                          align="end"
                          className="p-1 bg-neutral-950 rounded-xl shadow border border-white border-opacity-10 w-[212px]"
                        >
                          <DropdownMenuItem
                            onClick={() => setRateType("hour")}
                            className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-white text-sm flex items-center justify-between"
                          >
                            Hour
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setRateType("day")}
                            className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-white text-sm flex items-center justify-between"
                          >
                            Day
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setRateType("week")}
                            className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-white text-sm flex items-center justify-between"
                          >
                            Week
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <div className="flex-1"></div>
                  <Button
                    className="px-4 text-sm font-semibold"
                    variant="outline"
                    size="compact"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="px-4 min-w-[65px] text-sm font-semibold disabled:bg-opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed"
                    variant="accent"
                    size="compact"
                    disabled={!isValid || isValidating || !dirty || loading}
                    onClick={submitForm}
                  >
                    {!loading ? "Save" : <LoadingIndicator dark size="small" />}
                  </Button>
                </DialogFooter>
              </>
            );
          }}
        </Formik>
      </DialogContentPortless>
    </Dialog>
  );
};
