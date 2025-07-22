export const getMapUrl = async (locationAddress: string) => {
  if (!locationAddress) return null;

  const address = encodeURIComponent(locationAddress);
  const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${process.env.NEXT_PUBLIC_GOOGLE_KEY}`;

  fetch(geocodingUrl)
    .then((response) => response.json())
    .then((data) => {
      const location = data.results[0]?.geometry?.location;

      const lat = location?.lat;
      const lng = location?.lng;

      if (!lat || !lng) return;

      const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x300&markers=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_KEY}`;

      return staticMapUrl;
    });
};
