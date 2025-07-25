import React, { useEffect, useState, useRef, FC, useCallback } from "react";
import { GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { googleMapsLoader } from "@/lib/google/googleMapsLoader";
import { Icon } from "@/components/ui/Icon";
import { ProjectLocationWithAddress } from "@/components/blocks/ProjectDashboard/ProjectLocations/index";
import { LocationItem } from "@/components/blocks/CallSheet/Locations/LocationItem";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CallSheetLocationType } from "@/types/type";
import { createClient } from "@/lib/supabase/client";

type Props = {
  locations: any[]; //-- TODO: fix type here.
  shootLocations: ProjectLocationWithAddress[];
  parkingLocations: ProjectLocationWithAddress[];
  hospitalLocations: ProjectLocationWithAddress[];
  otherLocations: ProjectLocationWithAddress[];
  setLocationsModalOpen: (
    arg: ProjectLocationWithAddress | boolean | "add"
  ) => void;
  selectedLocation: ProjectLocationWithAddress | null;
  setSelectedLocation: (
    arg:
      | ProjectLocationWithAddress
      | (CallSheetLocationType & { address: string })
      | null
  ) => void;
  onOrderChanged?: () => void;
};

declare global {
  interface Window {
    google: typeof google;
  }
}

const LIGHT_MAP_STYLE = [
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

const DARK_MAP_STYLE = [
  {
    elementType: "geometry",
    stylers: [{ color: "#242f3e" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#242f3e" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "administrative",
    stylers: [{ visibility: "on" }],
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ visibility: "on", color: "#242f3e" }],
  },
];

export const DynamicPanoStreetMap: FC<Props> = (props) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const streetViewRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowsRef = useRef<google.maps.InfoWindow[]>([]);

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [panorama, setPanorama] =
    useState<google.maps.StreetViewPanorama | null>(null);
  const [currentLocationIndex, setCurrentLocationIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [shootLocations, setShootLocations] = useState<
    ProjectLocationWithAddress[]
  >(props.shootLocations);

  const [mapHeight, setMapHeight] = useState(55); //-- in percentage.
  const [sidebarWidth, setSidebarWidth] = useState(420); //-- in pixels.

  const sidebarDragRef = useRef(false);
  const lastXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastYRef = useRef(0);
  const [activeView, setActiveView] = useState<"maps" | "notebook">("maps");

  const getGlobalLocationIndex = useCallback(
    (locationId: number | string) => {
      return props.locations.findIndex((loc) => loc.id === locationId);
    },
    [props.locations]
  );

  const loader = googleMapsLoader();
  const supabase = createClient();

  // const handleReorder = (fromIndex: number, toIndex: number) => {
  //   const reorderedLocations = [...props.locations];
  //   const [movedItem] = reorderedLocations.splice(fromIndex, 1);
  //
  //   reorderedLocations.splice(toIndex, 0, movedItem);
  //   reorderedLocations.forEach((location, index) => {
  //     const marker = markersRef.current[fromIndex];
  //
  //     if (marker) {
  //       marker.setLabel({
  //         text: `${index + 1}`,
  //         color: "#ffffff",
  //       });
  //
  //       marker.setIcon({
  //         path: google.maps.SymbolPath.CIRCLE,
  //         scale: 12,
  //         fillColor: index === toIndex ? "#22c55e" : "#6b7280",
  //         fillOpacity: 0.8,
  //         strokeColor: "#ffffff",
  //         strokeWeight: 2,
  //       });
  //     }
  //   });
  //
  //   const markersCopy = [...markersRef.current];
  //   const infoWindowsCopy = [...infoWindowsRef.current];
  //   const [movedMarker] = markersCopy.splice(fromIndex, 1);
  //   const [movedInfoWindow] = infoWindowsCopy.splice(fromIndex, 1);
  //
  //   markersCopy.splice(toIndex, 0, movedMarker);
  //   infoWindowsCopy.splice(toIndex, 0, movedInfoWindow);
  //
  //   markersRef.current = markersCopy;
  //   infoWindowsRef.current = infoWindowsCopy;
  //
  //   if (currentLocationIndex === fromIndex) {
  //     setCurrentLocationIndex(toIndex);
  //
  //   } else if (
  //     currentLocationIndex > fromIndex &&
  //     currentLocationIndex <= toIndex
  //
  //   ) {
  //     setCurrentLocationIndex((prev) => prev - 1);
  //
  //   } else if (
  //     currentLocationIndex < fromIndex &&
  //     currentLocationIndex >= toIndex
  //
  //   ) {
  //     setCurrentLocationIndex((prev) => prev + 1);
  //   }
  //
  //   sampleLocations.length = 0;
  //   sampleLocations.push(...reorderedLocations);
  //
  //   setCurrentLocationIndex((prev) => prev);
  // };

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
      }

      const mapInstance = new google.maps.Map(mapRef.current, {
        center: {
          lat: props.locations[0].lat ?? 0,
          lng: props.locations[0].lng ?? 0,
        },
        zoom: 14,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: DARK_MAP_STYLE,
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

      const panoramaInstance = new google.maps.StreetViewPanorama(
        streetViewRef.current,
        {
          position: {
            lat: props.locations[0].lat ?? 0,
            lng: props.locations[0].lng ?? 0,
          },
          pov: {
            heading: 0,
            pitch: 0,
          },
          visible: true,
          motionTracking: false,
          motionTrackingControl: false,
        }
      );

      mapInstance.setStreetView(panoramaInstance);

      setMap(mapInstance);
      setPanorama(panoramaInstance);

      props.locations.forEach((location, index) => {
        const marker = new google.maps.Marker({
          position: {
            lat: location.lat ?? 0,
            lng: location.lng ?? 0,
          },
          map: mapInstance,
          label: {
            text: `${index + 1}`,
            color: "#ffffff",
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: index === 0 ? "#22c55e" : "#6b7280",
            fillOpacity: 0.8,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="color:black; padding: 8px;">
              <h3 style="font-weight: 600; margin: 0;">${location.name}</h3>
              <p style="font-size: 14px; margin: 4px 0 0;">${location.address}</p>
            </div>
          `,
        });

        marker.addListener("click", () => {
          infoWindowsRef.current.forEach((window) => window.close());
          infoWindow.open(mapInstance, marker);

          setCurrentLocationIndex(index);

          panoramaInstance.setPosition({
            lat: location.lat ?? 0,
            lng: location.lng ?? 0,
          });

          //-- selected the corresponding location card.
          const fullLocation = [
            ...props.shootLocations,
            ...props.parkingLocations,
            ...props.hospitalLocations,
            ...props.otherLocations,
          ].find((loc) => loc.id === location.id);

          if (fullLocation) {
            props.setSelectedLocation(fullLocation);
          } else {
            //-- fallback to the map location if full location can't be found.
            props.setSelectedLocation(location as any);
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

  useEffect(() => {
    if (mapRef.current && props.locations.length > 0) {
      //-- clear existing markers if map exists
      if (map) {
        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];
        infoWindowsRef.current = [];
      }

      //-- initialize or reinitialize the map.
      initMap();
    }
  }, [props.locations, refreshKey]);

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
    if (!panorama || !map) return;

    const location = props.locations[currentLocationIndex];
    const position = {
      lat: location.lat ?? 0,
      lng: location.lng ?? 0,
    };

    panorama.setPosition(position);
    map.panTo(position);
    updateLocationMarkers();
  }, [currentLocationIndex, panorama, map]);

  useEffect(() => {
    if (props.selectedLocation && props.locations.length > 0) {
      //-- find the index of the selected location in our locations array.
      const index = props.locations.findIndex(
        (location) => location.id === props.selectedLocation?.id
      );

      if (index !== -1) {
        //-- update current location index.
        setCurrentLocationIndex(index);
      }
    }
  }, [props.selectedLocation, props.locations]);

  const handlePrevLocation = () => {
    const newIndex =
      currentLocationIndex > 0
        ? currentLocationIndex - 1
        : props.locations.length - 1;

    setCurrentLocationIndex(newIndex);

    //-- find the location and then select it.
    const location = props.locations[newIndex];

    if (location) {
      props.setSelectedLocation(
        [
          ...props.shootLocations,
          ...props.parkingLocations,
          ...props.hospitalLocations,
          ...props.otherLocations,
        ].find((loc) => loc.id === location.id) || location
      );
    }
  };

  const handleNextLocation = () => {
    const newIndex =
      currentLocationIndex < props.locations.length - 1
        ? currentLocationIndex + 1
        : 0;

    setCurrentLocationIndex(newIndex);

    //-- find the location and then select it.
    const location = props.locations[newIndex];

    if (location) {
      props.setSelectedLocation(
        [
          ...props.shootLocations,
          ...props.parkingLocations,
          ...props.hospitalLocations,
          ...props.otherLocations,
        ].find((loc) => loc.id === location.id) || location
      );
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 0.01,
      },
    }),
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active && over && active.id !== over.id) {
      try {
        //-- get global indexes.
        const activeGlobalIndex = getGlobalLocationIndex(active.id);
        const overGlobalIndex = getGlobalLocationIndex(over.id);

        if (activeGlobalIndex === -1 || overGlobalIndex === -1) {
          console.error("Could not find location indexes.");

          return;
        }

        // Update local state immediately for responsiveness
        setShootLocations((prev) => {
          const oldIndex = prev.findIndex((el) => el.id === active.id);
          const newIndex = prev.findIndex((el) => el.id === over.id);

          return arrayMove(prev, oldIndex, newIndex);
        });

        //-- update the current location index if needed.
        if (currentLocationIndex === activeGlobalIndex) {
          setCurrentLocationIndex(overGlobalIndex);
        }

        //-- update record.
        const { error } = await supabase
          .from("project_location")
          .update({ order: overGlobalIndex })
          .eq("id", active.id);

        if (error) {
          console.error("Error updating location order:", error);

          return;
        }

        //-- refresh location data in ProjectLocations.
        if (props.onOrderChanged) {
          props.onOrderChanged();
        }

        setRefreshKey((prev) => prev + 1);
      } catch (err) {
        console.error("Error: ", err);
      }
    }
  }

  const handleDragStart = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastYRef.current = e.clientY;
    document.body.style.cursor = "row-resize";

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const delta = e.clientY - lastYRef.current;
      const containerHeight = window.innerHeight - 80;
      const percentageDelta = (delta / containerHeight) * 100;

      setMapHeight((prev) => {
        const newHeight = Math.min(Math.max(prev + percentageDelta, 20), 80);

        lastYRef.current = e.clientY;

        return newHeight;
      });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleSidebarDragStart = (e: React.MouseEvent) => {
    sidebarDragRef.current = true;
    lastXRef.current = e.clientX;
    document.body.style.cursor = "col-resize";

    const handleMouseMove = (e: MouseEvent) => {
      if (!sidebarDragRef.current) return;

      const delta = e.clientX - lastXRef.current;

      setSidebarWidth((prev) => {
        let newWidth = Math.min(Math.max(prev + delta, 280), 600);

        lastXRef.current = e.clientX;

        //-- make sure width is at least 420px.
        return newWidth >= 420 ? newWidth : 420;
      });
    };

    const handleMouseUp = () => {
      sidebarDragRef.current = false;
      document.body.style.cursor = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // const handleLocationUpdate = (
  //   locationId: number,
  //   updates: Partial<Location>
  // ) => {
  //   const location = props.locations.find((loc) => loc.id === locationId);
  //
  //   if (location) {
  //     Object.assign(location, updates);
  //
  //     setCurrentLocationIndex((prev) => prev);
  //   }
  // };

  return (
    <div className="flex flex-col h-full space-y-4 bg-background w-full">
      {error ? (
        <div className="p-4">
          <div className="text-destructive text-sm p-2 rounded-lg bg-destructive/10">
            {error}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 h-[calc(100vh-5rem)] overflow-hidden">
          <div
            className="flex flex-col gap-2 pr-4 overflow-y-scroll hide-scrollbars"
            style={{
              width: sidebarWidth,
            }}
          >
            <div className="flex flex-col gap-4 w-auto h-auto max-w-[500px] max-h-full max-sm:max-w-full max-sm:w-full max-sm:max-h-full max-sm:flex-1 overflow-hidden">
              <div className="flex-1 flex flex-col gap-2 w-full h-full overflow-y-scroll hide-scrollbars">
                <div className="flex flex-col gap-2 pb-4">
                  {shootLocations.length > 0 && (
                    <DndContext
                      collisionDetection={closestCenter}
                      modifiers={[restrictToVerticalAxis]}
                      onDragEnd={handleDragEnd}
                      sensors={sensors}
                    >
                      <div className="flex items-center justify-between gap-2 pb-2 font-medium">
                        <div className="flex items-center gap-3">
                          <Icon
                            name="shoot"
                            className="relative left-[0px] w-6 h-6 stroke-1 stroke-lime-300"
                          />

                          <div className="text-white text-opacity-95 text-[19px] font-bold">
                            Shoot Locations
                          </div>
                        </div>

                        {/*<div*/}
                        {/*  // onClick={() => setView("add")}*/}
                        {/*  className="group flex items-center justify-center w-[20px] h-[20px] rounded-full border border-zinc-600 cursor-pointer hover:border-zinc-500"*/}
                        {/*>*/}
                        {/*  <Icon*/}
                        {/*    name="plus"*/}
                        {/*    className="relative left-[0px] w-5 h-5 text-zinc-400 group-hover:text-zinc-300"*/}
                        {/*  />*/}
                        {/*</div>*/}
                      </div>

                      <SortableContext
                        items={shootLocations}
                        strategy={verticalListSortingStrategy}
                      >
                        {shootLocations.map(
                          (location: ProjectLocationWithAddress, i) => {
                            if (!location.address) return null;

                            const globalIndex = getGlobalLocationIndex(
                              location.id
                            );

                            return (
                              <>
                                {(location.type?.toLowerCase().trim() ===
                                  "shoot location" ||
                                  location.type?.toLowerCase().trim() ===
                                    "shoot") && (
                                  <LocationItem
                                    // variant="modal"
                                    view="tab"
                                    key={`${location.address}-${location.id}-${refreshKey}`}
                                    location={location}
                                    index={globalIndex !== -1 ? globalIndex : i}
                                    setSelectedLocation={
                                      props.setSelectedLocation
                                    }
                                    setOpen={props.setLocationsModalOpen}
                                    selectedLocation={props.selectedLocation}
                                    // setSelectedLocationMapUrl={
                                    //   setSelectedLocationMapUrl
                                    // }
                                  />
                                )}
                              </>
                            );
                          }
                        )}
                      </SortableContext>
                    </DndContext>
                  )}
                </div>

                {props.parkingLocations.length > 0 && (
                  <div className="flex flex-col gap-2 pb-4">
                    <div className="flex items-center justify-between gap-2 pb-2 font-medium">
                      <div className="flex items-center gap-3">
                        <Icon
                          name="parking"
                          className="relative left-[0px] w-6 h-6"
                        />

                        <div className="text-white text-opacity-95 text-[19px] font-bold">
                          Parking Locations
                        </div>
                      </div>

                      {/*<div*/}
                      {/*  // onClick={() => setView("add")}*/}
                      {/*  className="group flex items-center justify-center w-[20px] h-[20px] rounded-full border border-zinc-600 cursor-pointer hover:border-zinc-500"*/}
                      {/*>*/}
                      {/*  <Icon*/}
                      {/*    name="plus"*/}
                      {/*    className="relative left-[0px] w-5 h-5 text-zinc-400 group-hover:text-zinc-300"*/}
                      {/*  />*/}
                      {/*</div>*/}
                    </div>

                    {props.parkingLocations.map(
                      (location: ProjectLocationWithAddress, i) => {
                        if (!location.address) return null;

                        const globalIndex = getGlobalLocationIndex(location.id);

                        return (
                          <>
                            {(location.type?.toLowerCase().trim() ===
                              "parking" ||
                              location.type?.toLowerCase().trim() ===
                                "truck parking") && (
                              <LocationItem
                                // variant="modal"
                                view="tab"
                                key={`${location.address}-${location.id}-${refreshKey}`}
                                location={location}
                                index={globalIndex !== -1 ? globalIndex : i}
                                setSelectedLocation={props.setSelectedLocation}
                                setOpen={props.setLocationsModalOpen}
                                selectedLocation={props.selectedLocation}
                                // setSelectedLocationMapUrl={
                                //   setSelectedLocationMapUrl
                                // }
                              />
                            )}
                          </>
                        );
                      }
                    )}
                  </div>
                )}

                {props.hospitalLocations.length > 0 && (
                  <div className="flex flex-col gap-2 pb-4">
                    <div className="flex items-center justify-between gap-2 pb-2 font-medium">
                      <div className="flex items-center gap-3">
                        <Icon
                          name="hospital"
                          className="relative left-[0px] w-6 h-6"
                        />

                        <div className="text-white text-opacity-95 text-[19px] font-bold">
                          Nearest Hospital
                        </div>
                      </div>

                      {/*<div*/}
                      {/*  // onClick={() => setView("add")}*/}
                      {/*  className="group flex items-center justify-center w-[20px] h-[20px] rounded-full border border-zinc-600 cursor-pointer hover:border-zinc-500"*/}
                      {/*>*/}
                      {/*  <Icon*/}
                      {/*    name="plus"*/}
                      {/*    className="relative left-[0px] w-5 h-5 text-zinc-400 group-hover:text-zinc-300"*/}
                      {/*  />*/}
                      {/*</div>*/}
                    </div>

                    {props.hospitalLocations.map(
                      (location: ProjectLocationWithAddress, i) => {
                        if (!location.address) return null;

                        const globalIndex = getGlobalLocationIndex(location.id);

                        return (
                          <>
                            {(location.type?.toLowerCase().trim() ===
                              "hospital" ||
                              location.type?.toLowerCase().trim() ===
                                "nearest hospital") && (
                              <LocationItem
                                // variant="modal"
                                view="tab"
                                key={`${location.address}-${location.id}-${refreshKey}`}
                                location={location}
                                index={globalIndex !== -1 ? globalIndex : i}
                                setSelectedLocation={props.setSelectedLocation}
                                setOpen={props.setLocationsModalOpen}
                                selectedLocation={props.selectedLocation}
                                // setSelectedLocationMapUrl={
                                //   setSelectedLocationMapUrl
                                // }
                              />
                            )}
                          </>
                        );
                      }
                    )}
                  </div>
                )}

                {props.otherLocations.length > 0 && (
                  <div className="flex flex-col gap-2 pb-4">
                    <div className="flex items-center justify-between gap-2 pb-2 font-medium">
                      <div className="flex items-center gap-3">
                        <Icon
                          name="pin"
                          className="relative left-[0px] w-6 h-6 text-lime-300"
                        />

                        <div className="text-white text-opacity-95 text-[19px] font-bold">
                          Other Locations
                        </div>
                      </div>

                      {/*<div*/}
                      {/*  // onClick={() => setView("add")}*/}
                      {/*  className="group flex items-center justify-center w-[20px] h-[20px] rounded-full border border-zinc-600 cursor-pointer hover:border-zinc-500"*/}
                      {/*>*/}
                      {/*  <Icon*/}
                      {/*    name="plus"*/}
                      {/*    className="relative left-[0px] w-5 h-5 text-zinc-400 group-hover:text-zinc-300"*/}
                      {/*  />*/}
                      {/*</div>*/}
                    </div>

                    {props.otherLocations.map(
                      (location: ProjectLocationWithAddress, i) => {
                        if (!location.address) return null;

                        const globalIndex = getGlobalLocationIndex(location.id);

                        return (
                          <LocationItem
                            // variant="modal"
                            view="tab"
                            key={`${location.address}-${location.id}-${refreshKey}`}
                            location={location}
                            index={globalIndex !== -1 ? globalIndex : i}
                            setSelectedLocation={props.setSelectedLocation}
                            setOpen={props.setLocationsModalOpen}
                            selectedLocation={props.selectedLocation}
                            // setSelectedLocationMapUrl={props.setSelectedLocationMapUrl}
                          />
                        );
                      }
                    )}
                  </div>
                )}

                <div
                  onClick={() => {
                    props.setSelectedLocation(null);
                    props.setLocationsModalOpen("add");
                  }}
                  className="group flex items-center justify-center gap-2 w-[150px] min-h-[50px] rounded-xl border border-zinc-700 cursor-pointer hover:bg-white/5"
                >
                  <Icon
                    name="plus"
                    className="w-5 h-5 text-white text-opacity-70 duration-150 group-hover:text-opacity-90"
                  />
                  <div className="text-white/70 group-hover:text-white/90">
                    Add Location
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            className="w-2 flex items-center justify-center cursor-col-resize group hover:bg-accent/10 transition-colors max-sm:hidden"
            onMouseDown={handleSidebarDragStart}
          >
            <div className="w-1 h-12 rounded-full bg-border group-hover:bg-accent/50 transition-colors flex items-center justify-center">
              <GripHorizontal className="h-3 w-3 text-muted-foreground rotate-90" />
            </div>
          </div>

          <div className="flex-1 flex flex-col p-4 space-y-4 overflow-hidden relative max-sm:hidden">
            <div className="flex justify-center mb-2">
              {/*<div className="inline-flex items-center bg-secondary rounded-full p-1">*/}
              {/*  <button*/}
              {/*    onClick={() => setActiveView("maps")}*/}
              {/*    className={cn(*/}
              {/*      "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors",*/}
              {/*      activeView === "maps"*/}
              {/*        ? "bg-background text-foreground shadow-sm"*/}
              {/*        : "text-muted-foreground hover:text-foreground"*/}
              {/*    )}*/}
              {/*  >*/}
              {/*    <MapIcon className="h-4 w-4" />*/}
              {/*    Maps*/}
              {/*  </button>*/}

              {/*  <button*/}
              {/*    onClick={() => setActiveView("notebook")}*/}
              {/*    className={cn(*/}
              {/*      "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors",*/}
              {/*      activeView === "notebook"*/}
              {/*        ? "bg-background text-foreground shadow-sm"*/}
              {/*        : "text-muted-foreground hover:text-foreground"*/}
              {/*    )}*/}
              {/*  >*/}
              {/*    /!*<BookOpen className="h-4 w-4" />*!/*/}
              {/*    Notebook*/}
              {/*  </button>*/}
              {/*</div>*/}
            </div>

            <div
              className={cn(
                "flex-1 flex flex-col space-y-4",
                activeView === "maps" ? "visible" : "invisible hidden"
              )}
            >
              <div
                className="relative"
                style={{
                  height: `${mapHeight}%`,
                }}
              >
                <div
                  ref={mapRef}
                  className="absolute inset-0 rounded-lg overflow-hidden shadow-lg"
                />

                {!isAddingLocation && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-2 rounded-full shadow-lg z-10">
                    <Button
                      variant="ghost"
                      size="compact"
                      onClick={handlePrevLocation}
                      className="h-8 w-8"
                    >
                      <Icon
                        name="chevron"
                        className="h-4 w-4 text-black rotate-180"
                      />
                    </Button>

                    <span className="px-2 text-black text-sm font-medium">
                      {currentLocationIndex + 1} / {props.locations.length}
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

              <div
                className="h-2 mx-auto w-full flex items-center justify-center cursor-row-resize group hover:bg-accent/10 transition-colors rounded-full"
                onMouseDown={handleDragStart}
              >
                <div className="h-1 w-12 rounded-full bg-border group-hover:bg-accent/50 transition-colors flex items-center justify-center">
                  <GripHorizontal className="h-3 w-3 text-muted-foreground" />
                </div>
              </div>

              <div
                ref={streetViewRef}
                className="rounded-lg overflow-hidden shadow-lg"
                style={{
                  height: `${100 - mapHeight - 2}%`,
                }}
              />
            </div>

            <div
              className={cn(
                "h-full rounded-lg border border-border bg-card",
                activeView === "notebook" ? "visible" : "invisible hidden"
              )}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};
