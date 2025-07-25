import React, { useEffect, useState, useRef, FC } from "react";
import { googleMapsLoader } from "@/lib/google/googleMapsLoader";

type Location = {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  tags: string[];
};

type Props = {
  // apiKey: string;
  locations: Location[];
  onLocationSelect?: (index: number) => void;
  currentLocationIndex?: number;
};

const MAP_STYLE = [
  {
    featureType: "poi",
    stylers: [
      {
        visibility: "off",
      },
    ],
  },
  {
    featureType: "transit",
    stylers: [
      {
        visibility: "off",
      },
    ],
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [
      {
        visibility: "on",
      },
    ],
  },
  {
    featureType: "road",
    elementType: "labels.icon",
    stylers: [
      {
        visibility: "off",
      },
    ],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [
      {
        visibility: "on",
      },
    ],
  },
  {
    featureType: "water",
    stylers: [
      {
        visibility: "on",
      },
    ],
  },
  {
    featureType: "administrative",
    stylers: [
      {
        visibility: "on",
      },
    ],
  },
];

export const DynamicMap: FC<Props> = (props) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowsRef = useRef<google.maps.InfoWindow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loader = googleMapsLoader();

  const initMap = async () => {
    setIsLoading(true);
    setError(null);

    const scripts = document.querySelectorAll(
      'script[src*="maps.googleapis.com"]'
    );
    scripts.forEach((script) => script.remove());

    try {
      const google = await loader.load();

      if (!mapRef.current) {
        throw new Error("Map container not found");
      }

      const mapInstance = new google.maps.Map(mapRef.current, {
        center: {
          lat: props.locations[0]?.lat || 42.3601,
          lng: props.locations[0]?.lng || -71.0589,
        },
        zoom: 14,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: MAP_STYLE,
        zoomControl: true,
        mapTypeControlOptions: {
          style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
          position: google.maps.ControlPosition.TOP_RIGHT,
        },
        backgroundColor: "#fff",
        maxZoom: 20,
        minZoom: 3,
        tilt: 0,
      });

      await new Promise<void>((resolve) => {
        google.maps.event.addListenerOnce(mapInstance, "idle", () => {
          resolve();
        });
      });

      setMap(mapInstance);

      //-- clear previous markers.
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      infoWindowsRef.current = [];

      //-- add markers for each location.
      props.locations.forEach((location, index) => {
        const marker = new google.maps.Marker({
          position: {
            lat: location.lat,
            lng: location.lng,
          },
          map: mapInstance,
          label: {
            text: `${index + 1}`,
            color: "#ffffff",
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor:
              index === props.currentLocationIndex ? "#22c55e" : "#6b7280",
            fillOpacity: 0.8,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px;">
              <h3 style="color: black; font-weight: 600; margin: 0;">${
                location.name
              }</h3>
              
              <p style="color: black; font-size: 14px; margin: 4px 0 0;">${
                location.address
              }</p>
              
              <p style="color: black; font-size: 12px; margin: 4px 0 0;">Tags: ${location.tags.join(
                ", "
              )}</p>
            </div>
          `,
        });

        marker.addListener("click", () => {
          //-- close all other info windows.
          infoWindowsRef.current.forEach((window) => window.close());
          infoWindow.open(mapInstance, marker);

          //-- call onLocationSelect if provided.
          if (props.onLocationSelect) {
            props.onLocationSelect(index);
          }
        });

        markersRef.current.push(marker);
        infoWindowsRef.current.push(infoWindow);
      });

      setIsLoading(false);
    } catch (error) {
      console.error("Error initializing map:", error);

      setError("Failed to load Google Maps.");
      setIsLoading(false);
    }
  };

  //-- initialize map.
  useEffect(() => {
    initMap();

    return () => {
      //-- clean up markers on unmount.
      markersRef.current.forEach((marker) => marker.setMap(null));
    };
  }, []);

  //-- update marker styles when currentLocationIndex changes.
  useEffect(() => {
    if (!map) return;

    markersRef.current.forEach((marker, index) => {
      marker.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: index === props.currentLocationIndex ? "#22c55e" : "#6b7280",
        fillOpacity: 0.8,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      });
    });

    //-- pan to the selected location.
    if (
      props.currentLocationIndex !== undefined &&
      props.locations[props.currentLocationIndex]
    ) {
      map.panTo({
        lat: props.locations[props.currentLocationIndex].lat,
        lng: props.locations[props.currentLocationIndex].lng,
      });

      const currentZoom = map.getZoom();

      if (currentZoom && currentZoom > 12) {
        map.setZoom(currentZoom - 0.5);

        setTimeout(() => {
          map.setZoom(currentZoom);
        }, 300);
      }
    }
  }, [props.currentLocationIndex, map, props.locations]);

  //-- update markers when a location changes.
  useEffect(() => {
    if (!map) return;

    //-- clear previous markers.
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    infoWindowsRef.current = [];

    //-- add updated markers for each location.
    props.locations.forEach((location, index) => {
      const marker = new google.maps.Marker({
        position: {
          lat: location.lat,
          lng: location.lng,
        },
        map: map,
        label: {
          text: `${index + 1}`,
          color: "#ffffff",
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor:
            index === props.currentLocationIndex ? "#22c55e" : "#6b7280",
          fillOpacity: 0.8,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
        <div style="padding: 8px;">
          <h3 style="color: black; font-weight: 600; margin: 0;">${
            location.name
          }</h3>
          
          <p style="color: black; font-size: 14px; margin: 4px 0 0;">${
            location.address
          }</p>
          
          <p style="color: black; font-size: 12px; margin: 4px 0 0;">Tags: ${location.tags.join(
            ", "
          )}</p>
        </div>
      `,
      });

      marker.addListener("click", () => {
        //-- close all other info windows.
        infoWindowsRef.current.forEach((window) => window.close());
        infoWindow.open(map, marker);

        //-- call onLocationSelect if provided.
        if (props.onLocationSelect) {
          props.onLocationSelect(index);
        }
      });

      markersRef.current.push(marker);
      infoWindowsRef.current.push(infoWindow);
    });
  }, [props.locations, map, props.currentLocationIndex]);

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
          <div className="text-sm">Loading map...</div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
          <div className="text-sm text-destructive">{error}</div>
        </div>
      )}

      <div
        ref={mapRef}
        className="w-full h-full rounded-lg overflow-hidden shadow-lg"
      />
    </div>
  );
};
