import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/Collapsible";
import { Icon } from "@/components/ui/Icon";

export const Automation = () => {
  return (
    <div className="px-4 py-2 bg-white bg-opacity-[0.02] rounded-3xl border border-white border-opacity-10 flex-col flex">
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="w-full h-8 flex items-center justify-between [&>svg]:data-[state=open]:rotate-90">
          <div className="text-white text-opacity-95 text-base font-medium">
            Automation
          </div>
          <Icon
            name="chevron-small"
            className="min-w-[32px] w-[32px] h-[32px] duration-100 text-white"
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="py-2">
          <div className="w-full text-stone-300 text-sm font-normal">
            Crew will be messaged by hiring order, with a 4 hour wait time, and
            asked for referrals.
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
