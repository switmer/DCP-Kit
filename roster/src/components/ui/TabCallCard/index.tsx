import { cn } from "@/lib/utils";
import React from "react";
import { Icon } from "@/components/ui/Icon";

export const TabCallCard: React.FC<{
  options: string[];
  selected: string;
  setSelected: (selected: string) => void;
}> = ({ options, selected, setSelected }) => {
  return (
    <div className="flex relative h-[50px] p-1 bg-[#2C2C2C]/70 rounded-[56px] backdrop-blur-sm">
      <div
        className="absolute h-[42px] left-1 rounded-[56px] duration-150"
        style={{
          width: `calc(50% - 4px)`,
          transform: `translateX(${selected === options[0] ? "0" : "100%"})`,
          backgroundColor: "#090909",
        }}
      ></div>
      {options.map((o) => (
        <button
          onClick={() => {
            if (o === "crew") {
              //-- push new history state here that we can catch when we go "back" on the browser.
              window.history.pushState({ view: "crew" }, "", "");
            }

            setSelected(o);
          }}
          key={o}
          className={cn(
            "flex justify-center items-center h-[40px] w-1/2 gap-[6px] px-4 z-10 rounded-[56px] text-[18px] font-medium stone-300 capitalize cursor-pointer",
            selected === o &&
              "text-lime-300 font-medium border border-lime-300/75"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
};
