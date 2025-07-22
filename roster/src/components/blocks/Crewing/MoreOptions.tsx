import { FC } from "react";
import { Icon } from "@/components/ui/Icon";

type Props = {
  prop?: string;
};

export const MoreOptions: FC<Props> = (props) => {
  const renderBetaTag = () => {
    return (
      <div className="flex items-center justify-center w-[45px] h-[18px] font-medium text-xs text-lime-300 rounded-3xl bg-lime-300/20">
        BETA
      </div>
    );
  };

  return (
    <div className="flex flex-col pt-3 gap-2 max-sm:mb-[100px]">
      <div className="text-[18px] text-white/60">More options:</div>

      <div
        className="flex gap-3 [@media(max-width:1050px)]:flex-col"
        onClick={() => null}
      >
        <div className="flex items-center min-w-[285px] h-[75px] px-4 gap-4 max-sm:gap-2 max-sm:px-3 border-[2px] border-dashed border-lime-300/20 rounded-2xl cursor-pointer hover:border-lime-300/40 max-sm:w-full">
          {/*<Icon name="plus" className="w-5 h-5" />*/}
          <div>i</div>

          <div className="text-[18px] font-bold text-lime-300/70 max-sm:text-[14px]">
            Upload the budget
          </div>

          {renderBetaTag()}
        </div>

        <div
          className="group flex items-center justify-between min-w-[390px] w-[420px] h-[75px] px-4 gap-4 max-sm:px-3 max-sm:gap-2 border-[2px] border-lime-300/20 rounded-2xl cursor-pointer hover:border-lime-300/40 [@media(max-width:1050px)]:w-full max-sm:min-w-[340px]"
          onClick={() => null}
        >
          <div className="flex items-center justify-center gap-3">
            {/*<Icon name="plus" className="w-5 h-5" />*/}
            <div>i</div>

            <div className="text-[18px] font-bold text-lime-300/70 max-sm:text-[14px]">
              CrewUp Assistant
            </div>

            {renderBetaTag()}
          </div>

          <div className="flex items-center justify-center w-[100px] h-[25px] px-2 pr-3 font-medium text-[12px] text-lime-300/70 rounded-3xl bg-lime-300/10 group-hover:bg-lime-300/20 group-hover:text-lime-300/90">
            <Icon name="plus" className="w-5 h-5" />
            Start Chat
          </div>
        </div>
      </div>
    </div>
  );
};
