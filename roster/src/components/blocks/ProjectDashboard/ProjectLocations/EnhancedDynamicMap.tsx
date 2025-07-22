import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { googleMapsLoader } from "@/lib/google/googleMapsLoader";

type Location = {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  tags?: string[];
};

type DynamicMapProps = {
  locations: Location[];
  currentLocationIndex: number;
  onLocationSelect: (index: number) => void;
  showStreetView?: boolean;
  mapHeight?: string | number;
  streetViewHeight?: string | number;
};

declare global {
  interface Window {
    google: typeof google;
  }
}

export const EnhancedDynamicMap: React.FC<DynamicMapProps> = ({
  locations,
  currentLocationIndex,
  onLocationSelect,
  showStreetView = false,
  mapHeight = "50%",
  streetViewHeight = "50%",
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const streetViewRef = useRef<HTMLDivElement>(null);

  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowsRef = useRef<google.maps.InfoWindow[]>([]);

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [panorama, setPanorama] =
    useState<google.maps.StreetViewPanorama | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loader = googleMapsLoader();

  const MAP_STYLE = [
    {
      featureType: "poi",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "transit",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "landscape",
      elementType: "geometry",
      stylers: [{ visibility: "on" }],
    },
    {
      featureType: "road",
      elementType: "labels.icon",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ visibility: "on" }],
    },
    {
      featureType: "water",
      stylers: [{ visibility: "on" }],
    },
    {
      featureType: "administrative",
      stylers: [{ visibility: "on" }],
    },
  ];

  const initMap = async () => {
    setIsLoading(true);
    setError(null);

    const scripts = document.querySelectorAll(
      'script[src*="maps.googleapis.com"]'
    );
    scripts.forEach((script) => script.remove());

    try {
      const google = await loader.load();

      if (!mapRef.current || !streetViewRef.current) {
        throw new Error("Map container not found");

        setIsLoading(false);
      }

      if (locations.length === 0) {
        setIsLoading(false);
        return;
      }

      const mapInstance = new google.maps.Map(mapRef.current, {
        center: {
          lat: locations[currentLocationIndex]?.lat || 0,
          lng: locations[currentLocationIndex]?.lng || 0,
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

      let panoramaInstance: google.maps.StreetViewPanorama | null = null;

      // if (showStreetView && streetViewRef.current) {
      //   //-- check availability of street view.
      //   const streetViewService = new google.maps.StreetViewService();
      //   const location = locations[currentLocationIndex];
      //
      //   try {
      //     const streetViewData =
      //       await new Promise<google.maps.StreetViewPanoramaData>(
      //         (resolve, reject) => {
      //           streetViewService.getPanorama(
      //             {
      //               location: { lat: location.lat, lng: location.lng },
      //               radius: 50, //-- in meters.
      //             },
      //             (data, status) => {
      //               if (status === google.maps.StreetViewStatus.OK && data) {
      //                 resolve(data);
      //               } else {
      //                 reject(
      //                   new Error(
      //                     `No Street View available for this location: ${status}`
      //                   )
      //                 );
      //               }
      //             }
      //           );
      //         }
      //       );
      //
      //     const panoramaInstance = new google.maps.StreetViewPanorama(
      //       streetViewRef.current,
      //       {
      //         position: streetViewData?.location?.latLng,
      //         pov: {
      //           heading: 0,
      //           pitch: 0,
      //         },
      //         visible: true,
      //         motionTracking: false,
      //         motionTrackingControl: false,
      //       }
      //     );
      //
      //     mapInstance.setStreetView(panoramaInstance);
      //     setPanorama(panoramaInstance);
      //   } catch (err: any) {
      //     console.error(`Street View error: ${err.message}`);
      //
      //     setPanorama(null);
      //   }
      // }

      setMap(mapInstance);
      setPanorama(panoramaInstance);

      //-- clear previous markers if any.
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      infoWindowsRef.current = [];

      //-- create markers for each location.
      locations.forEach((location, index) => {
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
            fillColor: index === currentLocationIndex ? "#22c55e" : "#6b7280",
            fillOpacity: 0.8,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px;">
              <h3 style="font-weight: 600; margin: 0;">${location.name}</h3>
              <p style="font-size: 14px; margin: 4px 0 0;">${location.address}</p>
            </div>
          `,
        });

        marker.addListener("click", () => {
          infoWindowsRef.current.forEach((window) => window.close());
          infoWindow.open(mapInstance, marker);

          onLocationSelect(index);
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

  useEffect(() => {
    if (mapRef.current && locations.length > 0) {
      initMap();
    }
  }, [locations, currentLocationIndex]);

  const updateLocationMarkers = () => {
    markersRef.current.forEach((marker, index) => {
      marker.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: index === currentLocationIndex ? "#22c55e" : "#6b7280",
        fillOpacity: 0.8,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      });
    });
  };

  useEffect(() => {
    if (!panorama || !map || locations.length === 0) return;

    const location = locations[currentLocationIndex];
    const position = {
      lat: location.lat,
      lng: location.lng,
    };

    panorama.setPosition(position);
    map.panTo(position);
    updateLocationMarkers();
  }, [currentLocationIndex, panorama, map, locations]);

  const handlePrevLocation = () => {
    if (locations.length <= 1) return;
    onLocationSelect(
      currentLocationIndex > 0 ? currentLocationIndex - 1 : locations.length - 1
    );
  };

  const handleNextLocation = () => {
    if (locations.length <= 1) return;
    onLocationSelect(
      currentLocationIndex < locations.length - 1 ? currentLocationIndex + 1 : 0
    );
  };

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-800">
        <span className="text-white/50">{error}</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-800">
        <span className="text-white/50">Loading map...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div
        className="relative w-full h-full"
        // style={{ width: 500, height: mapHeight }}
      >
        <div
          id="map"
          ref={mapRef}
          className="w-full min-h-[400px] h-[400px] rounded-lg overflow-hidden"
          style={{ height: mapHeight }}
        />

        {locations.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm p-2 rounded-full shadow-lg z-10">
            <Button
              variant="ghost"
              size="compact"
              onClick={handlePrevLocation}
              className="h-8 w-8"
            >
              <Icon name="chevron" className="h-4 w-4 rotate-180 text-black" />
            </Button>

            <span className="text-sm font-medium px-2">
              {currentLocationIndex + 1} / {locations.length}
            </span>

            <Button
              variant="ghost"
              size="compact"
              onClick={handleNextLocation}
              className="h-8 w-8"
            >
              <Icon name="chevron" className="h-4 w-4 text-black" />
            </Button>
          </div>
        )}
      </div>

      {showStreetView && (
        <div
          ref={streetViewRef}
          className="w-full min-h-[400px] h-[400px] rounded-lg overflow-hidden mt-2"
          style={{ height: streetViewHeight }}
        />
      )}
    </div>
  );
};
