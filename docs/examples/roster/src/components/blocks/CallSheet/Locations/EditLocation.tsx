import React, { FC, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  CallSheetLocationType,
  LocationType,
  ProjectLocationType,
} from "@/types/type";
import { formatLocationName } from "@/components/blocks/CallSheet/Locations/util/formatLocationName";
import { capitalizeString, cn } from "@/lib/utils";
import { TypeTagSelection } from "@/components/blocks/CallSheet/Locations/TypeTagSelection";
import { Label } from "@/components/ui/Label";
import { LocationInput } from "@/components/blocks/CallSheet/Locations/LocationInput";
import { getLocationTypeIcon } from "@/components/blocks/CallSheet/Locations/util/getLocationTypeIcon";
import { Skeleton } from "@/components/ui/Skeleton";
import Image from "next/image";
import { ProjectLocationWithAddress } from "@/components/blocks/ProjectDashboard/ProjectLocations";

type Props = {
  location:
    | ProjectLocationWithAddress
    | (CallSheetLocationType & { address: string });
  mapUrl: string | null;
  setSelectedLocation: (
    location:
      | ProjectLocationWithAddress
      | (CallSheetLocationType & { address: string })
      | null
  ) => void;
  newLocationName: string;
  setNewLocationName: (newLocationName: string) => void;
  newLocationAddress: string;
  setNewLocationAddress: (newLocationAddress: string) => void;
  newLocationType: string | null;
  setNewLocationType: (newLocationType: string) => void;
  newLocationInstructions: string | null;
  setNewLocationInstructions: (newLocationInstructions: string | null) => void;
  newLocationDescription: string | null;
  setNewLocationDescription: (newLocationDescription: string | null) => void;
};

export const EditLocation: FC<Props> = (props) => {
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [addingInstructions, setAddingInstructions] = useState(
    !!props.location.instructions ?? false
  );
  const [userAddressInput, setUserAddressInput] = useState<string>("");
  const [initialLocationDescription, setInitialLocationDescription] = useState<
    string | null
  >(props.location.description);
  const [newLocation, setNewLocation] =
    useState<google.maps.places.PlaceResult | null>(null);
  const [locationTypeSuggestions, setLocationTypeSuggestions] = useState<
    string[]
  >([
    "Shoot",
    "Nearest Hospital",
    "Parking",
    "Truck Parking",
    "Production Office",
    "Basecamp",
  ]);
  const [mapUrl, setMapUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const addCustomTag = (type: string) => {
    setLocationTypeSuggestions((prev) => {
      return [...prev, capitalizeString(type)];
    });
  };

  useEffect(() => {
    if (!props.location.type) return;

    if (
      !locationTypeSuggestions.includes(capitalizeString(props.location.type))
    ) {
      addCustomTag(props.location.type);
    }
  }, []);

  useEffect(() => {
    if (!newLocation || !newLocation.name || !newLocation.formatted_address) {
      return;
    }

    props.setNewLocationName(newLocation.name);
    props.setNewLocationAddress(newLocation.formatted_address);
  }, [newLocation]);

  useEffect(() => {
    const fetchMapUrl = async () => {
      if (!props.location.address || mapUrl) return;

      setIsLoading(true);

      const address = encodeURIComponent(
        newLocation?.formatted_address ?? props.location.address
      );
      const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${process.env.NEXT_PUBLIC_GOOGLE_KEY}`;

      await fetch(geocodingUrl)
        .then((response) => response.json())
        .then((data) => {
          const location = data.results[0]?.geometry?.location;

          const lat = location?.lat;
          const lng = location?.lng;

          if (!lat || !lng) return;

          const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x300&markers=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_KEY}&style=feature:all%7Celement:all%7Cinvert_lightness:true`;

          setMapUrl(staticMapUrl);
          setIsLoading(false);
        });
    };

    fetchMapUrl();
  }, [newLocation]);

  if (!props.location || !props.location.address) return null;

  return (
    <div className="p-6 flex flex-col gap-4 w-auto h-auto max-w-[500px] max-h-[570px] max-sm:max-w-full max-sm:w-full max-sm:max-h-full max-sm:flex-1">
      <>
        <div
          onClick={() => {
            props.setSelectedLocation(null);
            props.setNewLocationName("");
            props.setNewLocationAddress("");
            props.setNewLocationDescription(null);
            props.setNewLocationInstructions(null);
            props.setNewLocationType("");
          }}
          className="flex items-center w-[75px] gap-3 cursor-pointer pt-0 pb-1 text-white/80 hover:text-white/100"
        >
          <Icon name="chevron" className="w-4 h-4 rotate-180" />
          <div className="text-lg"> Back</div>
        </div>

        {!!props.location && (
          <div
            // ref={setNodeRef}
            // style={style}
            key={props.location.address}
            className="group flex flex-col gap-3 w-full cursor-pointer"
            onClick={() => null}
          >
            <Label className={cn("flex flex-col gap-[3px]")}>
              <div className="pb-1 text-sm text-white/70">Type of location</div>

              <TypeTagSelection
                label="Location type"
                value={props.location.type ?? "shoot"}
                suggestions={locationTypeSuggestions}
                setNewLocationType={props.setNewLocationType}
                addCustomTagCallback={addCustomTag}
              />
            </Label>

            <Label className={cn("flex flex-col gap-[3px]")}>
              <div className="pb-1 text-sm text-white/70">Description</div>

              <input
                className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
                onChange={(e) =>
                  props.setNewLocationDescription(e.target.value)
                }
                value={
                  /*
                  this value is prioritized in this order:
                    - newLocationDescription (new user input)
                    - the initial location description
                    - the new location type
                    - original location description

                  the field can be completely deleted to allow for new user input but if it's blurred while empty,
                  it will autofill with the currently selected newLocationType. if one doesn't exist for some reason,
                  it will default to "shoot".
                 */
                  props.newLocationDescription ??
                  capitalizeString(
                    initialLocationDescription ??
                      props.newLocationType ??
                      (props.location.description as string)
                  )
                }
                onBlur={(e) => {
                  if (!e.target.value || e.target.value === "") {
                    props.setNewLocationDescription(null);
                    setInitialLocationDescription(null);

                    e.target.value = capitalizeString(
                      props.newLocationType ?? "shoot"
                    );

                    return;
                  }
                }}
                placeholder="e.g., placeholder description..."
              />
            </Label>

            {addingInstructions ? (
              <Label className={cn("flex flex-col gap-[3px]")}>
                <div
                  onClick={() => setAddingInstructions(false)}
                  className="flex items-center justify-between gap-1"
                >
                  <div className="pb-1 text-sm text-white/70">Instructions</div>

                  {!props.location.instructions && (
                    <div className="flex items-center justify-center w-[20px] h-[20px] p-[2px] bg-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-700 hover:text-white/90">
                      <Icon name="cross" className="w-3 h-3 text-white/50" />
                    </div>
                  )}
                </div>

                <input
                  className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
                  onChange={(e) => {
                    props.setNewLocationInstructions(e.target.value);
                  }}
                  value={
                    props.newLocationInstructions ??
                    props.location.instructions ??
                    ""
                  }
                  placeholder="e.g., placeholder instructions..."
                />
              </Label>
            ) : (
              <div
                onClick={() => setAddingInstructions(true)}
                className="flex items-center justify-center w-[150px] h-[25px] pr-1 bg-zinc-900 rounded-2xl cursor-pointer hover:bg-zinc-800/70 hover:text-white/90"
              >
                <Icon name="plus" className="w-5 h-5 text-white/80" />
                <div className="text-sm text-white/70">Add Instructions</div>
              </div>
            )}

            <div className="flex justify-between w-full border border-white/10 rounded-2xl">
              <div className="flex flex-col gap-[1px] min-w-[180px] max-w-[270px] py-[10px] pl-4 pr-2 border-white border-opacity-10 border-r max-sm:min-w-[unset] max-sm:max-w-[unset] max-sm:w-[55%]">
                <div className="flex items-center justify-start gap-2 h-[20px]">
                  <div className="">
                    {getLocationTypeIcon(props.newLocationType ?? "shoot")}
                  </div>

                  <div className="font-bold text-sm text-white truncate">
                    {props.newLocationDescription ??
                      capitalizeString(
                        initialLocationDescription ??
                          props.newLocationType ??
                          (props.location.description as string)
                      )}
                  </div>
                </div>

                <div className="text-white/80 font-bold font-label max-sm:text-xs">
                  {props.newLocationName ||
                    (props.location.name &&
                      formatLocationName(
                        props.newLocationName !== ""
                          ? props.newLocationName
                          : props.location.name
                      ))}
                </div>

                <div className="text-white text-opacity-60 text-sm max-sm:text-xs font-normal font-label">
                  {props.newLocationAddress
                    ? props.newLocationAddress
                    : props.location.address}
                </div>

                {!showLocationInput ? (
                  <div className="flex items-center h-[46px]">
                    <div
                      onClick={() => setShowLocationInput(true)}
                      className="flex items-center justify-center w-[150px] h-[30px] mt-[6px] pr-1 bg-zinc-900 rounded-2xl cursor-pointer hover:bg-zinc-800/70 hover:text-white/90"
                    >
                      <Icon name="plus" className="w-5 h-5 text-white/80" />
                      <div className="text-sm text-white/70">
                        Change Address
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pr-3">
                    <LocationInput
                      className="flex items-center w-full min-w-[242px] h-[40px] mt-[6px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60 max-sm:min-w-[unset] max-sm:w-full"
                      placeholder="Search address..."
                      value={userAddressInput}
                      onChange={(v: string) => {
                        if (!v) setUserAddressInput("");
                        setUserAddressInput(v);
                      }}
                      setNewLocation={setNewLocation}
                      setShowLocationInput={setShowLocationInput}
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {!isLoading && !!mapUrl ? (
                <div className="w-[45%]">
                  <Image
                    src={mapUrl}
                    width={300}
                    height={300}
                    className="w-[190px] h-full min-h-[115px] object-cover rounded-r-2xl"
                    alt={""}
                  />
                </div>
              ) : (
                <Skeleton className="w-[190px] h-auto" />
              )}
            </div>
          </div>
        )}
      </>
    </div>
  );
};
