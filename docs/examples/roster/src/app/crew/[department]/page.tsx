import { CrewTable } from "@/components/blocks/CrewTable";
import { CrewTableMobile } from "@/components/blocks/CrewTableMobile";

export default async function Crew() {
  return (
    <>
      <div className="max-sm:hidden">
        <CrewTable />
      </div>

      <div className="[@media(min-width:601px)]:hidden">
        <CrewTableMobile />
      </div>
    </>
  );
}
