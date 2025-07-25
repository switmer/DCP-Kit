export const fetchWeatherData = async (
  sheetDate: Date,
  weatherLocation: {
    lat: number;
    lng: number;
  },
) => {
  if (!weatherLocation) {
    return null;
  }

  try {
    const response = await fetch('/api/weather/get-forecast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        location: {
          lat: weatherLocation.lat,
          lng: weatherLocation.lng,
        },
        date: sheetDate ? new Date(sheetDate).toISOString() : null,
      }),
    });

    if (!response.ok) {
      new Error(`Server returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    return data;
  } catch (error) {
    console.error('Error fetching weather data:', error);

    return null;
  }
};
