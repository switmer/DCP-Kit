//-- load google places api if not already loaded.
async function loadGoogleMapsApi(): Promise<void> {
  if (!window.google?.maps) {
    const script = document.createElement("script");

    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_KEY}&libraries=places`;
    script.async = true;
    document.head.appendChild(script);

    await new Promise<void>((resolve, reject) => {
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Error: Failed to load Google Maps API."));
    });
  }
}

export const getGooglePlaceDetailsClientSide = async (address: string) => {
  try {
    await loadGoogleMapsApi(); //-- load google maps api.

    const placesService = new google.maps.places.PlacesService(
      document.createElement("div")
    );

    const request = {
      //-- our address to search for.
      query: address,

      //-- here we specify the fields we want back.
      fields: ["place_id"],
    };

    //-- use PlacesService to find place details.
    return new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
      placesService.findPlaceFromQuery(request, (results, status) => {
        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          results &&
          results[0]
        ) {
          const placeId = results[0].place_id; //-- get the place_id.

          if (!placeId) {
            reject(new Error("Failed to get place_id: " + status));
            return;
          }

          //-- fetch the detailed information using the place_id.
          placesService.getDetails(
            { placeId: placeId }, //-- fields: request.fields can go here. omitting it returns everything.
            (placeDetails, detailStatus) => {
              if (
                detailStatus === google.maps.places.PlacesServiceStatus.OK &&
                placeDetails
              ) {
                resolve(placeDetails); //-- return the detailed place information.
              } else {
                reject(
                  new Error(`Failed to fetch place details: ${detailStatus}`)
                );
              }
            }
          );
        } else {
          reject(new Error(`Failed to find place: ${status}`));
        }
      });
    });
  } catch (error) {
    console.error("Fetch failed:", error);
    throw error; //-- re-throw the error if needed.
  }
};
