'use client';

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { CallSheetLocationType, ProjectLocationType } from '@/types/type';
import { ManageProjectLocations } from '@/components/blocks/ProjectDashboard/ProjectLocations/ManageProjectLocations';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { LocationItem } from '@/components/blocks/CallSheet/Locations/LocationItem';
import { DynamicMap } from '@/components/blocks/ProjectDashboard/ProjectLocations/DynamicMap';
import { DynamicPanoStreetMap } from '@/components/blocks/ProjectDashboard/ProjectLocations/DynamicPanoStreetMap';

type Props = {
  projectId: string;
  view?: 'dash' | 'tab';
  projectLocationsModalOpen: boolean | ProjectLocationWithAddress | 'add';
  setLocationsEmpty: (bool: boolean) => void;
  setProjectLocationsModalOpen: (value: boolean | ProjectLocationWithAddress | 'add') => void;
};

export type ProjectLocationWithAddress = ProjectLocationType & {
  address: string | null;
  lat?: number;
  lng?: number;
};

export const ProjectLocations: FC<Props> = (props) => {
  const [locationsModalOpen, setLocationsModalOpen] = useState<
    ProjectLocationWithAddress | (CallSheetLocationType & { address: string }) | boolean | 'add'
  >(false);
  const [selectedLocation, setSelectedLocation] = useState<
    ProjectLocationWithAddress | (CallSheetLocationType & { address: string }) | null
  >(null);

  const [projectLocations, setProjectLocations] = useState<ProjectLocationWithAddress[]>([]);
  const [currentLocationIndex, setCurrentLocationIndex] = useState(0);
  const [loadingLocations, setLoadingLocations] = useState(true);

  const [refreshKey, setRefreshKey] = useState(0);

  const supabase = createClient();

  const fetchProjectLocations = useCallback(async () => {
    setLoadingLocations(true);

    const { data: projectLocations, error: projectLocationsError } = await supabase
      .from('project_location')
      .select()
      .eq('project', props.projectId)
      .order('order', { ascending: true });

    if (projectLocationsError) {
      toast.error('Something went wrong fetching project locations.');
      console.error('Error: ', projectLocationsError);
      setLoadingLocations(false);
      return;
    }

    if (!projectLocations) {
      setProjectLocations([]);
      setLoadingLocations(false);
      return;
    }

    const { data: projectSheetLocations, error: projectSheetLocationsError } = await supabase
      .from('call_sheet_location')
      .select()
      .eq('project', props.projectId);

    if (projectSheetLocationsError) {
      toast.error('Something went wrong fetching project sheet locations.');
      console.error('Error: ', projectLocationsError);
      setLoadingLocations(false);
      return;
    }

    if (!projectSheetLocations) {
      // setProjectLocations([]);
      // setLoadingLocations(false);
      // return;
    }

    //-- flatten address from location to the root level and geocode.
    const flattenedData = await Promise.all(
      [...projectLocations, ...(projectSheetLocations.length > 0 ? projectSheetLocations : [])].map(
        async (project_location) => {
          if (!project_location) return null;

          const { data: location, error: locationError } = await supabase
            .from('location')
            .select()
            .eq('id', project_location.location as number);

          if (!location?.[0] || locationError) {
            toast.error('Something went wrong fetching related location.');
            console.error('Error: ', locationError);
            return null;
          }

          //-- geocode the address to get coordinates.
          const address = location[0].address;
          const enrichedLocation: ProjectLocationWithAddress = {
            ...project_location,
            address: address,
          };

          if (address) {
            //-- geocode the address.
            try {
              const encodedAddress = encodeURIComponent(address);
              const apiKey = process.env.NEXT_PUBLIC_GOOGLE_KEY;
              const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;
              const response = await fetch(geocodingUrl);
              const data = await response.json();

              if (data.results?.[0]?.geometry?.location) {
                enrichedLocation.lat = data.results[0].geometry.location.lat;
                enrichedLocation.lng = data.results[0].geometry.location.lng;
              }
            } catch (error) {
              console.error('Error:', error);
            }
          }

          return enrichedLocation;
        },
      ),
    );

    const validProjectLocations = flattenedData.filter(
      (location): location is ProjectLocationWithAddress => location !== null && location !== undefined,
    );

    setProjectLocations(validProjectLocations);
    setLoadingLocations(false);

    if (selectedLocation && locationsModalOpen === false) {
      //-- find the updated version of the currently selected location.
      const updatedSelectedLocation = validProjectLocations.find((loc) => loc.id === selectedLocation.id);

      //-- update the selected location with fresh data or clear it if not found.
      setSelectedLocation(updatedSelectedLocation || null);
    }

    setRefreshKey((prev) => prev + 1);
  }, [props.projectId, supabase, selectedLocation, locationsModalOpen]);

  useEffect(() => {
    fetchProjectLocations();
  }, [props.projectId]);

  const sortedLocations = useMemo(() => {
    if (!projectLocations) return [];

    //-- extract nested locations.
    const locationObjects: ProjectLocationWithAddress[] = projectLocations.filter((l) => l.id !== null);

    return locationObjects.sort((a, b) => {
      //-- sort by type (shoot -> parking -> hospital -> others)...
      const priorityOrder = ['shoot', 'shoot location', 'parking', 'truck parking', 'hospital', 'nearest hospital'];

      const priorityA =
        priorityOrder.indexOf(a.type as string) !== -1 ? priorityOrder.indexOf(a.type as string) : priorityOrder.length;

      const priorityB =
        priorityOrder.indexOf(b.type as string) !== -1 ? priorityOrder.indexOf(b.type as string) : priorityOrder.length;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      //-- ...then sort by order and handle possible nulls.
      const orderA = a.order ?? Infinity;
      const orderB = b.order ?? Infinity;

      return orderA - orderB;
    });
  }, [projectLocations]);

  //-- format locations for our map component.
  const mapLocations = useMemo(() => {
    return sortedLocations
      .filter((location) => location.lat !== undefined && location.lng !== undefined)
      .map((location, index) => ({
        id: location.id || index,
        name: location.name || `Location ${index + 1}`,
        address: location.address || '',
        lat: location.lat as number,
        lng: location.lng as number,
        tags: location.type ? [location.type as string] : [],
      }));
  }, [sortedLocations, projectLocations]);

  //-- other location filtering and categorization...
  const shootLocations: ProjectLocationWithAddress[] = useMemo(
    () =>
      sortedLocations
        .filter(
          (location) =>
            location.type?.toLowerCase().trim() === 'shoot' || location.type?.toLowerCase().trim() === 'shoot location',
        )
        .sort((a, b) => {
          const orderA = a.order ?? Infinity;
          const orderB = b.order ?? Infinity;

          return orderA - orderB;
        }),
    [sortedLocations, projectLocations],
  );

  const parkingLocations: ProjectLocationWithAddress[] = sortedLocations.filter(
    (location) =>
      location.type?.toLowerCase().trim() === 'parking' || location.type?.toLowerCase().trim() === 'truck parking',
  );

  const hospitalLocations: ProjectLocationWithAddress[] = sortedLocations.filter(
    (location) =>
      location.type?.toLowerCase().trim() === 'nearest hospital' || location.type?.toLowerCase().trim() === 'hospital',
  );

  const otherLocations: ProjectLocationWithAddress[] = sortedLocations.filter(
    (location) =>
      location.type?.toLowerCase().trim() !== 'shoot' &&
      location.type?.toLowerCase().trim() !== 'shoot location' &&
      location.type?.toLowerCase().trim() !== 'parking' &&
      location.type?.toLowerCase().trim() !== 'truck parking' &&
      location.type?.toLowerCase().trim() !== 'nearest hospital' &&
      location.type?.toLowerCase().trim() !== 'hospital',
  );

  const handleLocationsSaved = useCallback(() => {
    fetchProjectLocations();

    setRefreshKey((prev) => prev + 1);
  }, [fetchProjectLocations]);

  useEffect(() => {
    if (projectLocations.length === 0) {
      props.setLocationsEmpty(true);
    } else {
      props.setLocationsEmpty(false);
    }
  }, [projectLocations]);

  useEffect(() => {
    setLocationsModalOpen(props.projectLocationsModalOpen);
  }, [props.projectLocationsModalOpen]);

  useEffect(() => {
    props.setProjectLocationsModalOpen(locationsModalOpen);
  }, [locationsModalOpen]);

  const handleLocationOrderChanged = useCallback(() => {
    //-- refresh data.
    fetchProjectLocations();

    setRefreshKey((prev) => prev + 1);
  }, [fetchProjectLocations]);

  const handleLocationSelect = (index: number) => {
    setCurrentLocationIndex(index);

    setSelectedLocation(
      mapLocations[index] ? projectLocations.find((loc) => loc.id === mapLocations[index].id) || null : null,
    );
  };

  // const toggleStreetView = () => {
  //   setShowStreetView((prev) => !prev);
  // };

  return (
    <>
      {projectLocations.length > 0 && props.view === 'dash' ? (
        <div className="flex flex-col gap-2 h-full pt-2">
          <div className="w-full h-[300px] rounded-lg overflow-hidden">
            {mapLocations.length > 0 ? (
              <DynamicMap
                locations={mapLocations}
                currentLocationIndex={currentLocationIndex}
                onLocationSelect={handleLocationSelect}
              />
            ) : loadingLocations ? (
              <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                <span className="text-white/50">Loading map...</span>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                <span className="text-white/50">No locations with coordinates found.</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 overflow-y-scroll hide-scrollbars">
            {shootLocations.map((location) => {
              const mapIndex = mapLocations.findIndex((loc) => loc.id === location.id);
              return (
                <LocationItem
                  view="dash"
                  className="h-full"
                  key={location.id}
                  location={location}
                  setOpen={setLocationsModalOpen}
                  index={mapIndex !== -1 ? mapIndex : 0}
                  selectedLocation={selectedLocation}
                  setSelectedLocation={setSelectedLocation}
                  onMapMarkerSelect={() => {
                    if (mapIndex !== -1) {
                      handleLocationSelect(mapIndex);
                    }
                  }}
                />
              );
            })}

            {/* parking locations */}
            {parkingLocations.map((location) => {
              const mapIndex = mapLocations.findIndex((loc) => loc.id === location.id);
              return (
                <LocationItem
                  view="dash"
                  className="h-full"
                  key={location.id}
                  location={location}
                  setOpen={setLocationsModalOpen}
                  index={mapIndex !== -1 ? mapIndex : 0}
                  selectedLocation={selectedLocation}
                  setSelectedLocation={setSelectedLocation}
                  onMapMarkerSelect={() => {
                    if (mapIndex !== -1) {
                      handleLocationSelect(mapIndex);
                    }
                  }}
                />
              );
            })}

            {/* hospital locations */}
            {hospitalLocations.map((location) => {
              const mapIndex = mapLocations.findIndex((loc) => loc.id === location.id);
              return (
                <LocationItem
                  view="dash"
                  className="h-full"
                  key={location.id}
                  location={location}
                  setOpen={setLocationsModalOpen}
                  index={mapIndex !== -1 ? mapIndex : 0}
                  selectedLocation={selectedLocation}
                  setSelectedLocation={setSelectedLocation}
                  onMapMarkerSelect={() => {
                    if (mapIndex !== -1) {
                      handleLocationSelect(mapIndex);
                    }
                  }}
                />
              );
            })}

            {/* other locations */}
            {otherLocations.map((location) => {
              const mapIndex = mapLocations.findIndex((loc) => loc.id === location.id);
              return (
                <LocationItem
                  view="dash"
                  className="h-full"
                  key={location.id}
                  location={location}
                  setOpen={setLocationsModalOpen}
                  index={mapIndex !== -1 ? mapIndex : 0}
                  selectedLocation={selectedLocation}
                  setSelectedLocation={setSelectedLocation}
                  onMapMarkerSelect={() => {
                    if (mapIndex !== -1) {
                      handleLocationSelect(mapIndex);
                    }
                  }}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {props.view === 'dash' && (
            <div
              className="group flex flex-col gap-1 items-center justify-center w-full h-[150px] text-white/50 font-medium border-[3px] border-dashed border-zinc-500/40 rounded-xl cursor-pointer hover:border-zinc-500/60"
              onClick={(e) => {
                setLocationsModalOpen(true);
              }}
            >
              <div className="flex flex-col items-center justify-center gap-2">
                <Icon name="pinAlternative" className="w-[40px] h-[40px] text-white/40 group-hover:text-white/60" />

                <div className="flex gap-3 items-center justify-center w-full pb-2">
                  <div className="w-[20px] h-[20px] bg-zinc-800 rounded-full group-hover:bg-zinc-700">
                    <Icon name="plus" className="w-5 h-5 text-white/30 group-hover:text-white/50" />
                  </div>

                  <div className="text-sm text-white/60 font-bold uppercase group-hover:text-white/80">
                    Add Locations
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {projectLocations.length > 0 && props.view === 'tab' && (
        <div className="flex gap-3 w-full h-full pt-2">
          {/*<div className="flex flex-col w-full max-w-[375px] gap-2 overflow-y-scroll hide-scrollbars">*/}
          {/*  {projectLocations.map((location, i) => (*/}
          {/*    <LocationItem*/}
          {/*      view="tab"*/}
          {/*      className=""*/}
          {/*      key={location.id}*/}
          {/*      location={location}*/}
          {/*      setOpen={setLocationsModalOpen}*/}
          {/*      index={i}*/}
          {/*      selectedLocation={selectedLocation}*/}
          {/*      setSelectedLocation={setSelectedLocation}*/}
          {/*      // setSelectedLocationMapUrl={}*/}
          {/*    />*/}
          {/*  ))}*/}
          {/*</div>*/}

          <div className="w-full h-full min-h-[800px] rounded-lg overflow-hidden">
            {mapLocations.length > 0 ? (
              // <DynamicMap
              //   locations={mapLocations}
              //   currentLocationIndex={currentLocationIndex}
              //   onLocationSelect={handleLocationSelect}
              // />
              <DynamicPanoStreetMap
                key={`pano-map-${refreshKey}-${projectLocations.length}`}
                locations={mapLocations}
                shootLocations={shootLocations}
                parkingLocations={parkingLocations}
                hospitalLocations={hospitalLocations}
                otherLocations={otherLocations}
                setLocationsModalOpen={setLocationsModalOpen}
                selectedLocation={selectedLocation}
                setSelectedLocation={setSelectedLocation}
                onOrderChanged={handleLocationOrderChanged}
              />
            ) : // <EnhancedDynamicMap
            //   locations={mapLocations}
            //   currentLocationIndex={currentLocationIndex}
            //   onLocationSelect={handleLocationSelect}
            // />
            loadingLocations ? (
              <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                <span className="text-white/50">Loading map...</span>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                <span className="text-white/50">No locations with coordinates found.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {projectLocations.length > 0 && props.view !== 'dash' && props.view !== 'tab' && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2 pb-2">
            <Icon name="pinAlternative" className="w-7 h-7 text-white/70" />
            <div className="text-xl text-white/80">Locations</div>
          </div>

          <div className="h-[125px]">
            <div className="flex items-center gap-3 w-full max-w-[100vw] h-[125px] overflow-x-scroll hide-scrollbars max-sm:h-[120px]">
              {sortedLocations.map((location: ProjectLocationWithAddress, i) => (
                <LocationItem
                  className="h-full"
                  key={location.id}
                  location={location}
                  setOpen={setLocationsModalOpen}
                  index={i}
                  setSelectedLocation={setSelectedLocation}
                />
              ))}

              <div className="flex flex-col items-center justify-evenly gap-2 pr-3 h-full max-sm:py-3">
                <div
                  onClick={() => {
                    setLocationsModalOpen('add');
                  }}
                  className="flex flex-1 items-center justify-center w-[45px] h-[45px] bg-zinc-900/70 rounded-2xl text-white/30 cursor-pointer hover:bg-zinc-900/95 hover:text-white/65"
                >
                  <Icon name="plus" className="w-8 h-8" />
                </div>

                <div
                  onClick={() => {
                    setSelectedLocation(null);
                    setLocationsModalOpen(true);
                  }}
                  className="flex flex-1 items-center justify-center w-[45px] h-[45px] bg-zinc-900/70 rounded-2xl text-white/30 cursor-pointer hover:bg-zinc-900/95 hover:text-white/65"
                >
                  <Icon name="edit" className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {locationsModalOpen && (
        <ManageProjectLocations
          // initialView={initialModalView}
          project={props.projectId}
          shootLocations={shootLocations}
          parkingLocations={parkingLocations}
          hospitalLocations={hospitalLocations}
          otherLocations={otherLocations}
          open={locationsModalOpen}
          setOpen={setLocationsModalOpen}
          selectedLocation={selectedLocation}
          onLocationsSaved={handleLocationsSaved}
        />
      )}
    </>
  );
};
