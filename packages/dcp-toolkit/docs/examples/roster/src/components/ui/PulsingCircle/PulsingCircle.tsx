import { FC } from "react";
import { cn } from "@/lib/utils";

type Props = {
  variant?: "white" | "yellow";
};

export const PulsingCircle: FC<Props> = (props) => {
  return (
    <div className="relative">
      <div
        className={cn("pulsing-circle")}
        style={{
          backgroundColor:
            props.variant === "white"
              ? "#ddddddaa"
              : props.variant === "yellow"
              ? "#eccc3c99"
              : "#7a960d",
        }}
      />

      <div
        className={cn(
          "absolute top-[4px] left-[4px] w-[8px] h-[8px] bg-[#d6fe50] rounded-full",
          props.variant === "white" && "bg-white",
          props.variant === "yellow" && "bg-[#eccc3c]"
        )}
      />
    </div>
  );
};
