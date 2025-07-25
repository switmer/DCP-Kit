import { Loader } from "@googlemaps/js-api-loader";

export const googleMapsLoader = () => {
  const LIBRARIES: ("places" | "geometry" | "drawing" | "visualization")[] = [
    "places",
  ];

  return new Loader({
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_KEY!,
    version: "weekly",
    libraries: LIBRARIES,
    language: "en",
    region: "US",
    authReferrerPolicy: "origin",
  });
};
