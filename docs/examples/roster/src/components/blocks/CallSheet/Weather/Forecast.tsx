import { FC } from "react";
import { format } from "date-fns";
import { capitalizeString } from "@/lib/utils";

type Props = {
  weather: any;
};

export const Forecast: FC<Props> = (props) => {
  return (
    <div className="flex justify-start items-center gap-2">
      {props.weather.list.map((day: any, i: number) => {
        if (i > 4) return;

        return (
          <div
            key={i}
            className="flex flex-col justify-center items-center w-[90px]"
          >
            <div className="text-[13px]">
              {format(new Date(day.dt * 1000), "h:mmaaa")}
            </div>

            <img
              className=""
              width={70}
              height={70}
              src={`https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png`}
              alt="Weather icon"
            />

            <div className="text-xs uppercase">
              {day.weather[0].description}
            </div>

            <div className="pl-1 font-bold text-zinc-300">
              {`${day.main.temp.toFixed()}º`}
            </div>
          </div>
        );
      })}
    </div>
  );
};
