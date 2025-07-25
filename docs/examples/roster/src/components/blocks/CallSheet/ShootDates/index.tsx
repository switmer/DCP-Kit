import React, { FC, useState } from "react";
import { formatSheetDate } from "@/components/blocks/CallSheet/ShootDates/formatSheetDate";
import { EditShootDate } from "@/components/blocks/CallSheet/ShootDates/EditShootDate";
import { CallSheetType } from "@/types/type";
import { useCallSheetStore } from "@/store/callsheet";
import { cn } from "@/lib/utils";

type Props = {
  loading: boolean;
  sheet: CallSheetType | any;
};

export const ShootDates: FC<Props> = (props) => {
  const [editShootDateModalOpen, setEditShootDateModalOpen] = useState(false);
  const { callPush, callPushesLoading } = useCallSheetStore();

  return (
    <div>
      <div
        onClick={() => setEditShootDateModalOpen(true)}
        className="inline-flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer hover:bg-stone-500/20"
      >
        <p
          className={cn(
            "text-pink-50 text-[22px] font-medium",
            !props.sheet?.raw_json?.full_date && "text-white/50"
          )}
        >
          {!props.loading && (
            <>
              {props.sheet?.raw_json?.full_date
                ? formatSheetDate(props.sheet?.raw_json?.full_date)
                : "+ Add shoot date"}
            </>
          )}
        </p>

        {!props.loading && props.sheet?.raw_json?.day_of_days && (
          <div className="text-xs flex items-center justify-center h-[26px] px-[10px] bg-foreground bg-opacity-5 rounded">
            {props.sheet?.raw_json?.day_of_days}
          </div>
        )}

        {!callPushesLoading && !!callPush && (
          <div className="text-xs flex items-center justify-center h-[26px] px-[10px] bg-[rgba(249,44,44,0.14)] text-[#FF3F3F] rounded font-medium">
            CALL PUSHED
          </div>
        )}
      </div>

      {editShootDateModalOpen && (
        <EditShootDate
          sheet={props.sheet}
          editShootDateModalOpen={editShootDateModalOpen}
          setEditShootDateModalOpen={setEditShootDateModalOpen}
        />
      )}
    </div>
  );
};
