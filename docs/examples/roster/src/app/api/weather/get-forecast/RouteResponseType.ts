export type CurrentWeather = {
  coord: {
    lon: number;
    lat: number;
  };
  weather: {
    id: number;
    main: string;
    description: string;
    icon: string;
  }[];
  base: string;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
    sea_level?: number;
    grnd_level?: number;
    temp_kf?: number;
  };
  visibility: number;
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  clouds: {
    all: number;
  };
  dt: number;
  sys: {
    type?: number;
    id?: number;
    pod?: string;
    country?: string;
    sunrise: number;
    sunset: number;
  };
  timezone: number;
  id?: number;
  name?: string;
  cod?: number;
  forecast_hour?: number;
  forecast_time?: string;
};

export type RouteResponseType = {
  current: CurrentWeather | null;
  requested_date: string | null;
  is_today: boolean;
  forecasts: any[];
  temp_range: {
    min: number | null;
    max: number | null;
  };
  city: {
    id?: number | null;
    name?: string | null;
    coord: {
      lat: number | null;
      lon: number | null;
    };
    country?: string | null;
    timezone: number | null;
    sunrise: number | null;
    sunset: number | null;
  } | null;
  available_dates: string[] | [];
};
