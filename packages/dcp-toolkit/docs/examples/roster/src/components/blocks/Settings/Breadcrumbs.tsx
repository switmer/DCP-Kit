import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { CompanyType } from "@/types/type";
import Link from "next/link";

export const Breadcrumbs = ({
  company,
  page,
}: {
  company: CompanyType;
  page: string;
}) => {
  return (
    <div className="flex flex-col gap-6 max-w-[calc(100vw-300px-85px)] overflow-auto">
      <div className="flex gap-2 items-center">
        <Link
          href={"/"}
          className="flex text-zinc-600 hover:text-white duration-100 cursor-pointer text-sm leading-none gap-2 items-center"
        >
          <Icon name="home" className="w-5 h-5" />
          {company.name}
        </Link>

        <Icon name="chevron-small" className="w-5 h-5 text-zinc-600" />

        <Link
          href="/settings"
          className={cn(
            "text-zinc-600 text-sm hover:text-white duration-100 cursor-pointer capitalize"
          )}
        >
          Settings
        </Link>

        <Icon name="chevron-small" className="w-5 h-5 text-zinc-600" />
        <div
          className={cn(
            "text-white text-sm  hover:text-white duration-100 cursor-pointer capitalize"
          )}
        >
          {page}
        </div>
      </div>
    </div>
  );
};
