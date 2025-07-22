export const getGooglePlaceDetailsServerSide = async (
  address: string
): Promise<any> => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_KEY;
  const encodedAddress = encodeURIComponent(address);
  const placeIdReqURL = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodedAddress}&inputtype=textquery&fields=place_id&key=${apiKey}`;

  try {
    const placeIdRes = await fetch(placeIdReqURL);

    if (!placeIdRes.ok) {
      console.error(
        `Error: Failed to fetch place_id: ${placeIdRes.statusText}`
      );
    }

    const placeIdJSON = await placeIdRes.json();

    if (!placeIdJSON.candidates.length) {
      console.error("Error:", placeIdJSON);
    }

    const placeId = placeIdJSON.candidates[0].place_id;
    const placeDetailsReqURL = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${apiKey}`;
    const placeDetailsRes = await fetch(placeDetailsReqURL);

    if (!placeDetailsRes.ok) {
      console.error(`Failed to fetch place_id: ${placeIdRes.statusText}`);
    }

    const placeDetailsJSON = await placeDetailsRes.json();

    if (placeDetailsJSON.status !== "OK") {
      console.error(
        `Error: Couldn't get place details for address: ${address}`
      );
    }

    return placeDetailsJSON;
  } catch (error) {
    console.error("Fetch failed:", error);
  }
};
