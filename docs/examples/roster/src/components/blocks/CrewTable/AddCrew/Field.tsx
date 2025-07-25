import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { TagInput } from "@/components/ui/TagInput";
import { cn } from "@/lib/utils";
import { FormikErrors, FormikTouched, FormikValues } from "formik";
import { ChangeEvent, useMemo } from "react";

export const Field = ({
  label,
  name,
  placeholder,
  type = "text",
  errors,
  touched,
  icon,
  validate,
  values,
  handleChange,
  onBlur,
  onFocus,
  suggestions,
  resetSuggestions,
  disabled,
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  errors: FormikErrors<FormikValues>;
  touched: FormikTouched<FormikValues>;
  icon?: string;
  validate?: (value: string) => string | undefined;
  values?: FormikValues;
  handleChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (e: ChangeEvent<HTMLInputElement>) => void;
  suggestions?: string[];
  resetSuggestions?: () => void;
  disabled?: boolean;
}) => {
  const extraProps = useMemo(() => {
    const res: Record<string, any> = {};

    if (handleChange) {
      res.onChange = handleChange;
    }
    if (onFocus) {
      res.onFocus = onFocus;
    }
    if (onBlur) {
      res.onBlur = onBlur;
    }

    return res;
  }, [handleChange, onBlur, onFocus]);

  return (
    <Label className="flex flex-col gap-2">
      {label}
      <div className="relative">
        {type === "tel" && (
          <PhoneInput
            name={name}
            placeholder={placeholder}
            value={values?.[name]}
            onChange={handleChange}
            skipValidation={true}
            className={cn(
              "h-11 px-[14px] bg-zinc-900 !rounded-lg shadow border border-zinc-700 placeholder:text-zinc-500/80 text-base focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40",
              !errors?.[name] &&
                !!touched?.[name] &&
                !!values?.[name] &&
                "!border-lime-300",
              !!errors?.[name] && !!touched?.[name] && "!border-pink-600",
              !!icon && "pl-[42px]"
            )}
          />
        )}

        {["text", "email"].includes(type) && (
          <Input
            className={cn(
              "h-11 px-[14px] bg-zinc-900 !rounded-lg shadow border border-zinc-700 placeholder:text-zinc-500/80 text-base focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40",
              !!values?.[name] &&
                !errors?.[name] &&
                !!touched?.[name] &&
                "!border-lime-300",
              !!errors?.[name] && !!touched?.[name] && "!border-pink-600",
              !!icon && "pl-[42px]"
            )}
            label={label}
            name={name}
            placeholder={placeholder}
            validate={validate}
            type={type}
            disabled={disabled}
            {...extraProps}
          />
        )}

        {type === "tag" && (
          <TagInput
            label={label}
            placeholder={placeholder}
            name={name}
            values={values}
            onFocus={onFocus}
            onBlur={onBlur}
            handleChange={handleChange}
            className={cn(
              "px-[14px] py-[10px] bg-zinc-900 !rounded-lg shadow border border-zinc-700 placeholder:text-zinc-500/80 text-base focus:border-gray-400 hover:border-gray-400 focus:ring-zinc-500 !focus:ring-opacity-40",
              !!values?.[name].length &&
                !errors?.[name] &&
                !!touched?.[name] &&
                "!border-lime-300",
              !!errors?.[name] && !!touched?.[name] && "!border-pink-600",
              !!icon && "pl-[42px]"
            )}
            suggestions={suggestions}
            resetSuggestions={resetSuggestions}
          />
        )}

        {icon && (
          <Icon
            name={icon}
            className="absolute top-1/2 -translate-y-1/2 left-[14px] w-5 h-5 text-neutral-400"
          />
        )}
      </div>
      {!!errors?.[name] && !!touched?.[name] && (
        <div className=" h-8 px-3 py-2 bg-pink-600 bg-opacity-10 rounded-md items-center flex gap-1">
          <Icon name="error" className="w-4 h-4 text-pink-600" />
          <div className="font-normal text-pink-600 text-xs leading-none">
            {errors?.[name] as string}
          </div>
        </div>
      )}
    </Label>
  );
};
