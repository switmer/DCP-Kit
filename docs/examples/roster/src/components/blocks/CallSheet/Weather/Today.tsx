import { FC } from "react";
import { capitalize } from "lodash";
import { getCardinalDirection } from "@/components/blocks/CallSheet/Weather/getCardinalDirection";

type Props = {
  weather: any;
};

export const Today: FC<Props> = (props) => {
  return (
    <div className="flex flex-col items-center w-[290px] rounded-lg p-2 pb-4">
      <div>
        <div className="flex items-center">
          <img
            className=""
            width={70}
            height={70}
            src={`https://openweathermap.org/img/wn/${props.weather.weather[0].icon}@2x.png`}
            alt="Weather icon"
          />

          <div className="text-3xl font-medium">{`${props.weather.main.temp.toFixed(
            0
          )}ºF`}</div>
        </div>

        <div className="flex gap-1 pl-1">
          <div className="text-sm font-bold">
            {`Feels like ${props.weather.main.feels_like.toFixed(0)}º.`}
          </div>

          <div className="text-sm font-bold">
            {`${capitalize(props.weather.weather[0].description)}.`}
          </div>
        </div>

        <div className="flex gap-3 pt-2 pl-3">
          <div className="flex flex-col">
            <div className="flex text-sm">
              <div className="font-bold pr-1">Wind: </div>

              {`${props.weather.wind.speed.toFixed(1)}m/s`}

              <div className="pl-1">
                {getCardinalDirection(props.weather.wind.deg)}
              </div>
            </div>

            <div className="flex text-sm">
              <div className="font-bold pr-1">Humidity:</div>

              {`${props.weather.main.humidity}%`}
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex text-sm">
              <div className="font-bold pr-1">Visibility:</div>
              {`${(props.weather.visibility / 1000).toFixed(1)}km`}
            </div>

            <div className="flex text-sm">
              <div className="font-bold pr-1">Pressure:</div>
              {`${props.weather.main.pressure}hPa`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
