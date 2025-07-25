import PhoneInputField, {
  isValidPhoneNumber,
} from "react-phone-number-input/input";
import { useField } from "formik";
import { cn } from "@/lib/utils";

export const PhoneInput: React.FC<any> = ({ className, ...props }) => {
  const [field, _meta, helpers] = useField({
    name: props.name,
    validate: (v) => {
      if (!v) return;

      if (props.skipValidation) return;

      let error;
      if (!isValidPhoneNumber(v)) {
        error = (
          <>
            <strong>Can you try again?</strong> Doesn’t look like a valid
            number.
          </>
        );
        return error as unknown as string;
      }
    },
  });

  return (
    <PhoneInputField
      {...props}
      {...field}
      value={field.value}
      className={cn(
        "flex h-14 w-full rounded-lg border-transparent border-[1.5px] duration-50 bg-zinc-900 p-4 pr-10 text-md ring-offset-transparent placeholder:text-zinc-600 focus:border-white outline-none focus-visible:outline-none focus:ring-4 focus:ring-[#4e46b4] focus:ring-opacity-20 focus:rounded-xl focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      defaultCountry="US"
      onChange={(value) => {
        helpers.setValue(value);
      }}
    />
  );
};
