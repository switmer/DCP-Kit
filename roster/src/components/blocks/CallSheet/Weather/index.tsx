import { FC, useEffect, useState } from "react";
import { toast } from "sonner";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { capitalizeString } from "@/lib/utils";
import { Forecast } from "@/components/blocks/CallSheet/Weather/Forecast";
import { Today } from "@/components/blocks/CallSheet/Weather/Today";

type Props = {
  location: {
    lat: number;
    lng: number;
  };
};

export const Weather: FC<Props> = (props) => {
  const [weatherData, setWeatherData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (props.location) {
      const fetchWeather = async () => {
        setIsLoading(true);

        try {
          const response = await fetch(`/weather/get-forecast`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              location: {
                lat: props.location.lat,
                lng: props.location.lng,
              },
              type: "single",
              // type: "five_day",
            }),
          });

          const data = await response.json();

          setWeatherData(data);
        } catch (error) {
          console.error("Error fetching weather data:", error);
          toast.error("Something went wrong fetching weather data.");
        }
      };

      fetchWeather();
    }

    setIsLoading(false);
  }, [props.location]);

  // if (!weatherData && !isLoading) return null;

  return (
    <>
      {isLoading && <LoadingIndicator size="small" />}

      {weatherData && (
        <>
          {weatherData.weather ? (
            <Today weather={weatherData} />
          ) : (
            <div className="flex items-center justify-center w-[500px] h-[180px] py-3 px-2 rounded-xl border border-zinc-600/20">
              <div className="flex flex-col">
                <div className="flex justify-between px-2 pb-2">
                  <div className="text-[16px] text-white font-medium uppercase">
                    Weather Forecast
                  </div>

                  <div className="text-[16px] text-white">
                    {capitalizeString(weatherData.city.name)}
                  </div>
                </div>

                <Forecast weather={weatherData} />
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
};
