import { Editable } from "@/components/ui/Editable";
import { CompanyCrewMemberType } from "@/types/type";

export const Details = ({
  member,
  onChange,
}: {
  departments?: string[];
  member?: CompanyCrewMemberType | null;
  onChange: (k: keyof CompanyCrewMemberType, v: any) => void;
}) => {
  const labels = {
    name: "Name",
    phone: "Phone",
    email: "Email",
    city: "City",
    state: "State",
  };

  if (!member) return <></>;

  return (
    <div className="grid gap-3">
      {[...Object.entries(labels)].map(([key, label], i) => {
        let type = "text";

        if (key === "phone") type = "tel";
        if (key === "email") type = "email";

        return (
          <div key={i} className="flex gap items-center">
            <div className="w-[85px] text-white text-opacity-60 text-sm font-medium leading-none">
              {label}
            </div>

            <Editable
              onChange={(v) => {
                onChange(key as keyof CompanyCrewMemberType, v);
              }}
              type={type}
              value={member[key as keyof CompanyCrewMemberType]}
            />
          </div>
        );
      })}
    </div>
  );
};
