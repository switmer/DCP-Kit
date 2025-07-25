import { useSearchPositions } from "@/store/crew";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { Icon } from "@/components/ui/Icon";
import { createClient } from "@/lib/supabase/client";
import { capitalizeString, cn } from "@/lib/utils";
import { PositionType, RankType, RateType } from "@/types/type";
import { DropdownMenuItem } from "@radix-ui/react-dropdown-menu";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export const Positions = ({
  positions,
  companyId,
  id,
  refreshRates,
  onUpdate,
  setEditPosition,
  openAdd,
}: {
  positions: PositionType[];
  companyId: string;
  id: number;
  refreshRates: number;
  onUpdate: () => void;
  setEditPosition: (
    payload: null | [PositionType, (name: string, department: string[]) => void]
  ) => void;
  openAdd?: () => void;
}) => {
  const { search: searchPositions } = useSearchPositions();
  const supabase = createClient();
  const [ranks, setRanks] = useState<RankType[]>([]);
  const [rates, setRates] = useState<RateType[]>([]);

  const getRanks = async () => {
    if (!companyId || !id) return { data: null, error: null };

    return await supabase
      .from("rank")
      .select()
      .eq("company", companyId)
      .in(
        "role",
        positions.map((p) => p?.name?.toLowerCase())
      )
      .overlaps("crew", [id?.toString()]);
  };

  const getRates = useCallback(async () => {
    if (!companyId || !id) return { data: null, error: null };

    return await supabase
      .from("role_rate")
      .select()
      .eq("crew_member", id)
      .in(
        "role",
        positions.map((p) => p?.name?.toLowerCase())
      );
  }, [companyId, id, positions, supabase]);

  useEffect(() => {
    if (!companyId || !id) return;

    getRanks().then(({ data }) => {
      setRanks(data ?? []);
    });

    getRates().then(({ data }) => {
      setRates(data ?? []);
    });
  }, [companyId, id]);

  useEffect(() => {
    if (!refreshRates) return;

    setTimeout(() => {
      getRates().then(({ data }) => {
        setRates(data ?? []);
      });
    }, 1000);
  }, [getRates, refreshRates]);

  const updatePosition = useCallback(
    (
      p: PositionType,
      newValue: string,
      newDepartment?: string[] | null,
      rate?: RateType | null
    ) => {
      if (!newValue) return;
      const oldPosition = p?.name;
      const newPosition = newValue?.toLocaleLowerCase();

      const oldRank = ranks?.find(
        (r) => r.role === oldPosition && r.crew?.includes(id)
      );

      const upsert = {
        ...p,
        name: newValue?.toLocaleLowerCase(),
      };

      if (newDepartment) {
        upsert.department = newDepartment?.map((d) => d?.toLocaleLowerCase());
      }

      supabase
        .from("position")
        .upsert(upsert)
        .then(async () => {
          if (rate) {
            await supabase.from("role_rate").upsert({
              ...rate,
              role: newPosition,
            });
          }

          if (oldRank) {
            await supabase.from("rank").upsert({
              ...oldRank,
              crew: oldRank.crew?.filter((c) => c !== id),
            });
          }

          onUpdate();
          toast.success("Position updated");
        });
    },
    [id, onUpdate, ranks, supabase]
  );

  return (
    <>
      <div className="flex flex-col">
        <div className="flex mb-3 gap-1 items center">
          <div className="text-white text-opacity-40 text-base leading-none flex-1 min-w-[219px]">
            Positions
          </div>
          <div className="text-white text-opacity-40 text-base leading-none w-[85px] text-center">
            Rate
          </div>
          <div className="text-white text-opacity-40 text-base leading-none w-8 text-center">
            Rank
          </div>
        </div>

        {positions
          ?.sort()
          ?.filter((p) => !!p?.name)
          ?.map((p, i) => {
            const position =
              searchPositions(p?.name as string)?.position ??
              capitalizeString(p?.name as string);

            const rank =
              ranks
                ?.find((r) => r.role === position?.toLocaleLowerCase())
                ?.crew?.indexOf(id) ?? null;

            const rate =
              rates?.find((r) => r.role === position?.toLocaleLowerCase()) ??
              null;

            return (
              <Position
                key={i}
                {...{
                  position,
                  p,
                  rank,
                  rate,
                  setEditPosition,
                  updatePosition,
                }}
              />
            );
          })}

        <button
          className="flex gap-1 cursor-pointer items-center text-sm font-medium text-white py-1 group"
          onClick={openAdd}
        >
          <div className="p-1">
            <Icon
              className="w-4 h-4 text-white text-opacity-60 group-hover:text-opacity-100 duration-100"
              name="plus-circle"
            />
          </div>
          Add
        </button>
      </div>
    </>
  );
};

export const Position: React.FC<{
  p: PositionType;
  position: string;
  rate: RateType | null;
  rank: number | null;
  setEditPosition: (
    payload: null | [PositionType, (name: string, department: string[]) => void]
  ) => void;
  updatePosition: (
    p: PositionType,
    newValue: string,
    newDepartment?: string[] | null,
    rate?: RateType | null
  ) => void;
}> = ({ rate, position, rank, setEditPosition, p, updatePosition }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const onUpdate = (name: string, department: string[]) => {
    updatePosition(p, name, department, rate);
  };

  return (
    <div
      onClick={() => {
        setEditPosition([p, onUpdate]);
      }}
      className="flex items-center mt-1 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-md px-2 -mx-2 group cursor-pointer"
    >
      <div className="text-white text-opacity-60 text-[16px] font-normal leading-[30px] flex-1">
        <div
          className={cn(
            "text-white text-opacity-60 -ml-2 w-full h-8 px-2 flex items-center text-base leading-tight min-w-[190px] border border-transparent cursor-pointer"
          )}
        >
          <span className="flex-1">{position}</span>
        </div>
      </div>

      <div className="w-[85px] text-center flex items-center justify-center text-opacity-40 text-white">
        {!rate?.rate ? (
          <button
            className="w-8 h-8 flex items-center justify-center opacity-80 hover:opacity-100 duration-150"
            onClick={() => setEditPosition([p, onUpdate])}
          >
            <Icon name="add" className="w-8 h-8 text-zinc-50" />
          </button>
        ) : (
          <button
            onClick={() => setEditPosition([p, onUpdate])}
            className="h-[30px] px-2 flex items-center justify-center text-white text-sm rounded-lg bg-white bg-opacity-0 hover:bg-opacity-10 duration-100"
          >
            ${rate?.rate}/
            {rate?.type === "hour"
              ? "hr"
              : rate?.type === "day"
              ? "day"
              : rate?.type === "week"
              ? "wk"
              : null}
          </button>
        )}
      </div>

      <div
        className={cn(
          "w-8 text-center text-white",
          rank === null && "text-opacity-40"
        )}
      >
        {rank === null ? "-" : rank + 1}
      </div>
    </div>
  );
};
