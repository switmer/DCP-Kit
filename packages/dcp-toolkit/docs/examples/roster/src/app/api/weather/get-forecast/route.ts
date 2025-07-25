import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  if (request.method !== 'POST') {
    return NextResponse.json({ error: 'Error: method not allowed.' }, { status: 405 });
  }

  const body = await request.json();
  const { lat, lng } = body.location;

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Error: latitude and/or longitude are required.' }, { status: 400 });
  }

  //-- parse the target date (or use current date if not provided).
  const targetDate = body.date ? new Date(body.date) : new Date();
  const targetDateString = targetDate.toISOString().split('T')[0]; //-- YYYY-MM-DD

  //-- get current date info.
  const currentDate = new Date();
  const currentDateString = currentDate.toISOString().split('T')[0];

  try {
    const oneCallResponse = await fetch(
      `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lng}&appid=${process.env.OPEN_WEATHER_API_KEY}&units=imperial`,
    );

    if (!oneCallResponse.ok) {
      throw new Error('Error fetching weather data from OpenWeatherMap API');
    }

    const oneCallData = await oneCallResponse.json();

    //-- extract available dates from daily forecasts.
    const availableDates = oneCallData.daily.map((day: any) => {
      const date = new Date(day.dt * 1000);
      return date.toISOString().split('T')[0];
    });

    //-- check if requested date is beyond available forecast range.
    if (!availableDates.includes(targetDateString)) {
      return NextResponse.json(
        {
          error: 'Forecast data is only available for the next 8 days',
          requested_date: targetDateString,
          available_dates: availableDates,
        },
        { status: 400 },
      );
    }

    //-- find the day index that matches the requested date.
    const targetDayIndex = availableDates.indexOf(targetDateString);

    //-- get the forecast data for the target day.
    const targetDayData = oneCallData.daily[targetDayIndex];

    //-- prepare the response object with only the requested day's forecast.
    const responseObject = {
      ...targetDayData,
      requested_date: targetDateString,
      is_today: targetDateString === currentDateString,
      available_dates: availableDates,
      lat: oneCallData.lat,
      lon: oneCallData.lon,
      timezone: oneCallData.timezone,
      timezone_offset: oneCallData.timezone_offset,
    };

    return NextResponse.json(responseObject, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching weather data:', error);

    return NextResponse.json({ error: 'Failed to fetch weather data', details: error.message }, { status: 500 });
  }
}
