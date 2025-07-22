import React, { FC, useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { ManageLocationsModal } from '@/components/blocks/CallSheet/Locations/ManageLocationsModal';
import { LocationItem } from '@/components/blocks/CallSheet/Locations/LocationItem';
import { CallSheetLocationType } from '@/types/type';
import { ProjectLocationWithAddress } from '@/components/blocks/ProjectDashboard/ProjectLocations';

type Props = {
  sheetLocations: any[] | null;
  callSheet: string;
  project: string;
  onLocationsSaved: () => void;
  weatherLocation?: { lat: number; lng: number } | null;
  setWeatherLocation?: (location: { lat: number; lng: number } | null) => void;
  setRefreshKey?: (cb: (k: number) => number) => void;
};

export const LocationCards: FC<Props> = (props) => {
  const [open, setOpen] = useState<
    ProjectLocationWithAddress | (CallSheetLocationType & { address: string }) | boolean | 'add'
  >(false);
  const [selectedLocation, setSelectedLocation] = useState<
    ProjectLocationWithAddress | (CallSheetLocationType & { address: string }) | null
  >(null);

  const sortedLocations = useMemo(() => {
    if (!props.sheetLocations) return [];

    //-- extract nested locations.
    const locationObjects = props.sheetLocations.filter((l) => l.id !== null);
    //   .map(
    //   (record) => record.location
    // );

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

      //-- ...then sort by priority and handle possible nulls.
      // const priorityValueA = a.priority !== null ? a.priority : Infinity;
      // const priorityValueB = b.priority !== null ? b.priority : Infinity;

      // return priorityValueA - priorityValueB;
      return a - b;
    });
  }, [props.sheetLocations]);

  const shootLocations = useMemo(
    () =>
      sortedLocations
        .filter(
          (location) =>
            location.type.toLowerCase().trim() === 'shoot' || location.type.toLowerCase().trim() === 'shoot location',
        )
        .sort((a, b) => a.order - b.order),
    [sortedLocations],
  );

  const parkingLocations = sortedLocations.filter(
    (location) =>
      location.type.toLowerCase().trim() === 'parking' || location.type.toLowerCase().trim() === 'truck parking',
  );

  const hospitalLocations = sortedLocations.filter(
    (location) =>
      location.type.toLowerCase().trim() === 'nearest hospital' || location.type.toLowerCase().trim() === 'hospital',
  );

  const otherLocations = sortedLocations.filter(
    (location) =>
      location.type.toLowerCase().trim() !== 'shoot' &&
      location.type.toLowerCase().trim() !== 'shoot location' &&
      location.type.toLowerCase().trim() !== 'parking' &&
      location.type.toLowerCase().trim() !== 'truck parking' &&
      location.type.toLowerCase().trim() !== 'nearest hospital' &&
      location.type.toLowerCase().trim() !== 'hospital',
  );

  return (
    <>
      {sortedLocations.length === 0 ? (
        <div
          className="group flex flex-col items-center justify-center min-w-[200px] max-w-[200px] h-[125px] p-2 rounded-xl border-[3px] border-white/20 border-dashed cursor-pointer hover:border-zinc-500/55"
          onClick={(e) => {
            // setSelectedLocation(null);
            setOpen(true);
          }}
        >
          <div>
            <Icon name="pinAlternative" className="w-[60px] h-[60px] text-white/30 group-hover:text-white/50" />{' '}
          </div>

          <div className="flex gap-3 items-center justify-center w-full pb-2">
            <div className="w-[20px] h-[20px] bg-zinc-800 rounded-full group-hover:bg-zinc-700">
              <Icon name="plus" className="w-5 h-5 text-white/60 group-hover:text-white/80" />
            </div>
            <div className="text-sm text-white/60 font-bold uppercase group-hover:text-white/80">Add Location</div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 w-full max-w-[100vw] h-[140px] overflow-x-scroll hide-scrollbars max-sm:h-[120px]">
          {sortedLocations.map((location: CallSheetLocationType & { address: string }, i) => {
            // if (!location.address) return null;

            return (
              <LocationItem
                key={location.id}
                location={location}
                setOpen={setOpen}
                index={i}
                setSelectedLocation={setSelectedLocation}
                weatherLocation={props.weatherLocation}
                setWeatherLocation={props.setWeatherLocation}
                // setSelectedLocationMapUrl={}
              />
            );
          })}

          <div className="flex flex-col items-center justify-evenly gap-2 py-2 pr-3 h-full max-sm:py-3">
            <div
              onClick={() => {
                setOpen('add');
              }}
              className="flex flex-1 items-center justify-center w-[45px] h-[45px] bg-zinc-900/70 rounded-2xl text-white/30 cursor-pointer hover:bg-zinc-900/95 hover:text-white/65"
            >
              <Icon name="plus" className="w-8 h-8" />
            </div>

            <div
              onClick={() => {
                setSelectedLocation(null);
                setOpen(true);
              }}
              className="flex flex-1 items-center justify-center w-[45px] h-[45px] bg-zinc-900/70 rounded-2xl text-white/30 cursor-pointer hover:bg-zinc-900/95 hover:text-white/65"
            >
              <Icon name="edit" className="w-5 h-5" />
            </div>

            {/*<Button*/}
            {/*  className="px-2 text-xs text-neutral-300 gap-1 bg-opacity-0 hover:text-accent"*/}
            {/*  variant={"secondary"}*/}
            {/*  onClick={() => {*/}
            {/*    setSelectedLocation(null);*/}
            {/*    setOpen(true);*/}
            {/*  }}*/}
            {/*>*/}
            {/*  <Icon name="edit" className="w-4 h-4 fill-none max-sm:hidden" />*/}
            {/*  <div className="max-sm:hidden">Manage Locations</div>*/}
            {/*</Button>*/}
          </div>
        </div>
      )}

      {!!open && (
        <ManageLocationsModal
          project={props.project}
          callSheet={props.callSheet}
          shootLocations={shootLocations}
          parkingLocations={parkingLocations}
          hospitalLocations={hospitalLocations}
          otherLocations={otherLocations}
          open={open}
          setOpen={setOpen}
          selectedLocation={selectedLocation}
          onLocationsSaved={() => {
            props.onLocationsSaved();

            if (props.setRefreshKey) {
              props.setRefreshKey((k) => k + 1);
            }
          }}
        />
      )}
    </>
  );
};
